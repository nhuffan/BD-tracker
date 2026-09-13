"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  getLegacySourceText,
  getTranslations,
  LOCALE_STORAGE_KEY,
  type Locale,
  translateLegacyText,
} from "@/lib/i18n/translations";

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);
  const originalTextRef = useRef(new WeakMap<Node, string>());
  const originalAttributesRef = useRef(new WeakMap<Element, Map<string, string>>());

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en" || stored === "vi" || stored === "zh-CN") setLocaleState(stored);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (hydrated) window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [hydrated, locale]);

  useEffect(() => {
    const originalText = originalTextRef.current;
    const originalAttributes = originalAttributesRef.current;
    const translatedAttributes = ["placeholder", "title", "aria-label", "alt"];
    let frameId = 0;

    const isKnownRendering = (source: string, current: string) =>
      (["en", "vi", "zh-CN"] as const).some(
        (candidateLocale) => translateLegacyText(source, candidateLocale) === current
      );

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const current = node.nodeValue ?? "";
        const leading = current.match(/^\s*/)?.[0] ?? "";
        const trailing = current.match(/\s*$/)?.[0] ?? "";
        const visible = current.trim();
        if (!visible) return;

        const stored = originalText.get(node);
        if (!stored || !isKnownRendering(stored, visible)) {
          originalText.set(node, getLegacySourceText(visible));
        }
        const source = originalText.get(node) ?? visible;
        const next = translateLegacyText(source, locale);
        const nextValue = `${leading}${next}${trailing}`;
        if (current !== nextValue) node.nodeValue = nextValue;
        return;
      }

      if (!(node instanceof Element)) return;
      const sourceMap = originalAttributes.get(node) ?? new Map<string, string>();
      originalAttributes.set(node, sourceMap);
      translatedAttributes.forEach((attribute) => {
        const current = node.getAttribute(attribute);
        if (!current) return;
        const stored = sourceMap.get(attribute);
        if (!stored || !isKnownRendering(stored, current)) {
          sourceMap.set(attribute, getLegacySourceText(current));
        }
        const source = sourceMap.get(attribute) ?? current;
        const next = translateLegacyText(source, locale);
        if (current !== next) node.setAttribute(attribute, next);
      });
    };

    const applyTranslations = () => {
      const root = document.body;
      translateNode(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        translateNode(node);
        node = walker.nextNode();
      }
    };

    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(applyTranslations);
    };

    applyTranslations();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, values) => interpolate(getTranslations(locale)[key] ?? key, values),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
