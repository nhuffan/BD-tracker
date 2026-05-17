"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Hammer, Sparkles, TimerReset, Trophy, Zap } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const ROUND_SECONDS = 30;
const HOLE_COUNT = 9;
const SNAKE_BOARD_SIZE = 12;
const SNAKE_SPEED_MS = 170;
const REMINDER_ROTATE_MS = 10000;
const POP_MESSAGES = [
  "Client complaint",
  "Urgent ping",
  "Hot fix",
  "Late request",
  "Need update",
  "ASAP call",
];
const REMINDER_QUOTES = [
  "Hôm nay có thể nhiều drama, nhưng lương không tự chạy nên mình cũng không tự gục.",
  "Đập vài con chuột trước, lát nữa quay lại rep khách hàng với nụ cười chuyên nghiệp.",
  "Ngày nào còn biết bật máy lên làm là ngày đó vẫn còn cửa thắng rất to.",
  "今天先别怀疑自己, 先怀疑那个一直催你的人。",
  "客户的消息可以很多, 但你的好运也在排队来。",
  "别急着崩溃, 你只是今天业务量过于华丽。",
  "오늘의 피곤함은 진짜지만, 네 실력도 진짜다.",
  "잠깐 쉬었다 가도 괜찮아, 잘하는 사람은 템포를 안 잃어.",
  "오늘 버틴 게 아니라, 오늘도 멋지게 통과한 거야.",
  "You do not need a perfect day to make solid progress.",
  "Answer later if needed, but never forget that your calm is part of the strategy.",
  "Some days are chaotic, but somehow you still make things work. That counts.",
];
const REMINDER_STYLES = [
  "from-amber-100/80 via-rose-100/70 to-sky-100/80 border-amber-200/70 dark:from-amber-950/35 dark:via-rose-950/25 dark:to-sky-950/35 dark:border-amber-800/60",
  "from-emerald-100/80 via-cyan-100/70 to-blue-100/80 border-emerald-200/70 dark:from-emerald-950/35 dark:via-cyan-950/25 dark:to-blue-950/35 dark:border-emerald-800/60",
  "from-fuchsia-100/80 via-pink-100/70 to-orange-100/80 border-pink-200/70 dark:from-fuchsia-950/35 dark:via-pink-950/25 dark:to-orange-950/35 dark:border-pink-800/60",
  "from-violet-100/80 via-indigo-100/70 to-sky-100/80 border-violet-200/70 dark:from-violet-950/35 dark:via-indigo-950/25 dark:to-sky-950/35 dark:border-violet-800/60",
];

type MoleState = {
  hole: number;
  message: string;
};

type HitEffect = {
  hole: number;
  points: number;
  id: string;
};

type SnakeCell = { x: number; y: number };
type SnakeDirection = "up" | "down" | "left" | "right";

function randomFoodPosition(snake: SnakeCell[]) {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
      y: Math.floor(Math.random() * SNAKE_BOARD_SIZE),
    };

    if (!snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)) {
      return candidate;
    }
  }
}

export default function StressReliefPage() {
  const [activeGame, setActiveGame] = useState<"whack" | "snake">("whack");
  const [running, setRunning] = useState(false);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("stress-relief-best-score") ?? 0);
  });
  const [mole, setMole] = useState<MoleState | null>(null);
  const [splatHole, setSplatHole] = useState<number | null>(null);
  const [hitEffect, setHitEffect] = useState<HitEffect | null>(null);
  const [reminderIndex, setReminderIndex] = useState(() =>
    Math.floor(Math.random() * REMINDER_QUOTES.length)
  );
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorSwinging, setCursorSwinging] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [snakeRunning, setSnakeRunning] = useState(false);
  const [snake, setSnake] = useState<SnakeCell[]>([
    { x: 5, y: 6 },
    { x: 4, y: 6 },
    { x: 3, y: 6 },
  ]);
  const [snakeDirection, setSnakeDirection] = useState<SnakeDirection>("right");
  const [snakeFood, setSnakeFood] = useState<SnakeCell>({ x: 8, y: 6 });
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeBestScore, setSnakeBestScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("stress-relief-snake-best-score") ?? 0);
  });
  const [snakeOver, setSnakeOver] = useState(false);

  const comboTimeoutRef = useRef<number | null>(null);
  const cursorTimeoutRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const snakeDirectionRef = useRef<SnakeDirection>("right");

  useEffect(() => {
    let mounted = true;

    async function loadCustomerNames() {
      const { data, error } = await supabase
        .from("records")
        .select("customer_name")
        .not("customer_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Failed to load customer names for stress game:", error);
        return;
      }

      if (!mounted) return;

      const names = Array.from(
        new Set(
          (data ?? [])
            .map((item) => item.customer_name?.trim())
            .filter(Boolean) as string[]
        )
      );

      setCustomerNames(names);
    }

    void loadCustomerNames();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!running || activeGame !== "whack") return;

    const timerInterval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setMole(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const moleInterval = window.setInterval(() => {
      setMole({
        hole: Math.floor(Math.random() * HOLE_COUNT),
        message:
          customerNames[Math.floor(Math.random() * customerNames.length)] ??
          POP_MESSAGES[Math.floor(Math.random() * POP_MESSAGES.length)],
      });
      setSplatHole(null);
    }, 650);

    return () => {
      window.clearInterval(timerInterval);
      window.clearInterval(moleInterval);
    };
  }, [running, customerNames, activeGame]);

  useEffect(() => {
    if (!snakeRunning || activeGame !== "snake") return;

    const interval = window.setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const direction = snakeDirectionRef.current;
        const nextHead =
          direction === "up"
            ? { x: head.x, y: head.y - 1 }
            : direction === "down"
              ? { x: head.x, y: head.y + 1 }
              : direction === "left"
                ? { x: head.x - 1, y: head.y }
                : { x: head.x + 1, y: head.y };

        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= SNAKE_BOARD_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= SNAKE_BOARD_SIZE;
        const hitSelf = prev.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );

        if (hitWall || hitSelf) {
          setSnakeRunning(false);
          setSnakeOver(true);
          return prev;
        }

        const ateFood = nextHead.x === snakeFood.x && nextHead.y === snakeFood.y;
        const nextSnake = ateFood ? [nextHead, ...prev] : [nextHead, ...prev.slice(0, -1)];

        if (ateFood) {
          setSnakeScore((current) => {
            const nextScore = current + 1;
            setSnakeBestScore((currentBest) => {
              if (nextScore > currentBest) {
                window.localStorage.setItem("stress-relief-snake-best-score", String(nextScore));
                return nextScore;
              }
              return currentBest;
            });
            return nextScore;
          });
          setSnakeFood(randomFoodPosition(nextSnake));
        }

        return nextSnake;
      });
    }, SNAKE_SPEED_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [snakeRunning, activeGame, snakeFood]);

  useEffect(() => {
    if (activeGame !== "snake") return;

    function handleKeyDown(event: KeyboardEvent) {
      const nextDirection =
        event.key === "ArrowUp" || event.key.toLowerCase() === "w"
          ? "up"
          : event.key === "ArrowDown" || event.key.toLowerCase() === "s"
            ? "down"
            : event.key === "ArrowLeft" || event.key.toLowerCase() === "a"
              ? "left"
              : event.key === "ArrowRight" || event.key.toLowerCase() === "d"
                ? "right"
                : null;

      if (!nextDirection) return;

      const opposite =
        (snakeDirectionRef.current === "up" && nextDirection === "down") ||
        (snakeDirectionRef.current === "down" && nextDirection === "up") ||
        (snakeDirectionRef.current === "left" && nextDirection === "right") ||
        (snakeDirectionRef.current === "right" && nextDirection === "left");

      if (opposite) return;

      snakeDirectionRef.current = nextDirection;
      setSnakeDirection(nextDirection);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGame]);

  useEffect(() => {
    const reminderInterval = window.setInterval(() => {
      setReminderIndex((prev) => {
        let next = prev;
        while (next === prev && REMINDER_QUOTES.length > 1) {
          next = Math.floor(Math.random() * REMINDER_QUOTES.length);
        }
        return next;
      });
    }, REMINDER_ROTATE_MS);

    return () => {
      window.clearInterval(reminderInterval);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        window.clearTimeout(comboTimeoutRef.current);
      }

      if (cursorTimeoutRef.current) {
        window.clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, []);

  function startGame() {
    setRunning(true);
    setScore(0);
    setCombo(0);
    setTimeLeft(ROUND_SECONDS);
    setMole({
      hole: Math.floor(Math.random() * HOLE_COUNT),
      message:
        customerNames[Math.floor(Math.random() * customerNames.length)] ??
        POP_MESSAGES[Math.floor(Math.random() * POP_MESSAGES.length)],
    });
    setSplatHole(null);
    setHitEffect(null);
  }

  function startSnakeGame() {
    const initialSnake = [
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 },
    ];
    setSnake(initialSnake);
    setSnakeDirection("right");
    snakeDirectionRef.current = "right";
    setSnakeFood(randomFoodPosition(initialSnake));
    setSnakeScore(0);
    setSnakeOver(false);
    setSnakeRunning(true);
  }

  function whack(hole: number) {
    if (!running || !mole || mole.hole !== hole) return;

    setSplatHole(hole);
    setMole(null);

    setCombo((prev) => {
      const nextCombo = prev + 1;
      const gained = 12 + Math.min(36, nextCombo * 3);
      setHitEffect({
        hole,
        points: gained,
        id: crypto.randomUUID(),
      });

      setScore((current) => {
        const nextScore = current + gained;
        setBestScore((currentBest) => {
          if (nextScore > currentBest) {
            window.localStorage.setItem("stress-relief-best-score", String(nextScore));
            return nextScore;
          }
          return currentBest;
        });
        return nextScore;
      });

      if (comboTimeoutRef.current) {
        window.clearTimeout(comboTimeoutRef.current);
      }

      comboTimeoutRef.current = window.setTimeout(() => {
        setCombo(0);
      }, 1000);

      return nextCombo;
    });

    window.setTimeout(() => {
      setSplatHole((prev) => (prev === hole ? null : prev));
    }, 220);
    window.setTimeout(() => {
      setHitEffect((prev) => (prev?.hole === hole ? null : prev));
    }, 520);
  }

  function updateCursorPosition(clientX: number, clientY: number) {
    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    setCursorPosition({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  function triggerCursorSwing() {
    setCursorSwinging(true);

    if (cursorTimeoutRef.current) {
      window.clearTimeout(cursorTimeoutRef.current);
    }

    cursorTimeoutRef.current = window.setTimeout(() => {
      setCursorSwinging(false);
    }, 160);
  }

  const reminderStyle = REMINDER_STYLES[reminderIndex % REMINDER_STYLES.length];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Pink Life Arcade</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Pick a quick mood reset and play for a minute.
          </div>
        </div>

        <div className="flex w-full rounded-2xl border border-border bg-muted/60 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveGame("whack");
              setSnakeRunning(false);
              setSnakeOver(false);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
              activeGame === "whack"
                ? "bg-rose-100 text-rose-800 shadow-sm ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/70"
                : "text-muted-foreground hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/25 dark:hover:text-rose-200"
            }`}
          >
            <span className="text-base leading-none">🐹</span>
            Whack-a-Mole
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveGame("snake");
              setRunning(false);
              setMole(null);
              setCursorVisible(false);
              setCursorSwinging(false);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
              activeGame === "snake"
                ? "bg-emerald-100 text-emerald-800 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/70"
                : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/25 dark:hover:text-emerald-200"
            }`}
          >
            <span className="text-base leading-none">🐍</span>
            Snake
          </button>
        </div>
      </div>

      {activeGame === "whack" ? (
        <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button className="cursor-pointer rounded-xl" onClick={startGame}>
            <Hammer className="mr-2 h-4 w-4" />
            {running ? "Restart Round" : "Start Round"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Score
            </div>
            <div className="mt-1 text-2xl font-black text-foreground">{score}</div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Best
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-black text-foreground">
              <Trophy className="h-5 w-5 text-amber-500" />
              {bestScore}
            </div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Combo
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-black text-foreground">
              <Zap className="h-5 w-5 text-sky-500" />
              {combo}
            </div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Time
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-black text-foreground">
              <TimerReset className="h-5 w-5 text-emerald-500" />
              {timeLeft}s
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-sm font-semibold text-foreground">Whack-a-Mole</div>
          </div>

          <div
            ref={boardRef}
            className="relative h-[560px] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.18),_transparent_34%),linear-gradient(180deg,#fce7f3_0%,#f9a8d4_36%,#be185d_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.16),_transparent_34%),linear-gradient(180deg,#831843_0%,#9d174d_42%,#500724_100%)] cursor-none"
            onMouseMove={(e) => {
              setCursorVisible(true);
              updateCursorPosition(e.clientX, e.clientY);
            }}
            onMouseEnter={(e) => {
              setCursorVisible(true);
              updateCursorPosition(e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              setCursorVisible(false);
              setCursorSwinging(false);
            }}
            onMouseDown={(e) => {
              updateCursorPosition(e.clientX, e.clientY);
              triggerCursorSwing();
            }}
          >
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.28),_transparent_70%)]" />

            {cursorVisible && (
              <div
                className="pointer-events-none absolute z-30 select-none transition-transform duration-100 ease-out"
                style={{
                  left: cursorPosition.x,
                  top: cursorPosition.y,
                  transform: cursorSwinging
                    ? "translate(-50%, -50%) rotate(22deg) scale(0.92)"
                    : "translate(-50%, -50%) rotate(-10deg) scale(1.06)",
                  transformOrigin: "50% 50%",
                }}
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/45 bg-white/90 text-[30px] shadow-[0_10px_25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/15 dark:bg-slate-900/88">
                  <span className="translate-x-[1px] translate-y-[1px]">🔨</span>
                </div>
              </div>
            )}

            <div className="grid h-full grid-cols-3 gap-8 px-8 py-10">
              {Array.from({ length: HOLE_COUNT }, (_, hole) => {
                const isUp = mole?.hole === hole;
                const isSplat = splatHole === hole;

                return (
                  <button
                    key={hole}
                    type="button"
                    onClick={() => whack(hole)}
                    className="group relative flex items-end justify-center rounded-[30px] outline-none"
                  >
                    <div className="absolute bottom-0 h-16 w-full max-w-[170px] rounded-[999px] border border-black/10 bg-[radial-gradient(circle_at_center,_#3f3f46_0%,_#27272a_55%,_#18181b_100%)] shadow-[inset_0_8px_20px_rgba(255,255,255,0.08),0_20px_30px_rgba(15,23,42,0.24)]" />

                    <div className="absolute bottom-6 h-[156px] w-[150px] rounded-full" />

                    <div
                      className={`absolute bottom-6 flex w-[132px] flex-col items-center justify-end transition-all duration-150 ${
                        isUp ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
                      }`}
                    >
                      <div className="mb-[-10px] text-[52px] leading-none">🐹</div>
                      <div className="rounded-2xl border border-white/30 bg-rose-500/90 px-3 py-2 text-center text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lg">
                        {mole?.message ?? ""}
                      </div>
                    </div>

                    {isSplat && (
                      <>
                        <div className="absolute bottom-[86px] h-24 w-24 animate-ping rounded-full bg-yellow-300/35" />
                        <div className="absolute bottom-[92px] rounded-full bg-yellow-300 px-4 py-1.5 text-sm font-black uppercase tracking-[0.18em] text-yellow-950 shadow-[0_12px_26px_rgba(234,179,8,0.45)]">
                          POW
                        </div>
                      </>
                    )}

                    {hitEffect?.hole === hole && (
                      <div
                        key={hitEffect.id}
                        className="pointer-events-none absolute bottom-[132px] animate-[bounce_0.5s_ease-out] text-center"
                      >
                        <div className="text-xl font-black tracking-[0.18em] text-white drop-shadow-[0_6px_14px_rgba(15,23,42,0.45)]">
                          +{hitEffect.points}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!running && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <h2 className="mt-4 text-4xl font-black tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.35)]">
                  Ready?
                </h2>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
            <div className="text-sm font-semibold text-foreground">How it works</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>1. Hit Start Round.</p>
              <p>2. Wait for the hamster mole to pop out.</p>
              <p>3. Click fast, chain combo, beat your best score.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
            <div className="text-sm font-semibold text-foreground">Mood Reset</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-muted/50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Hit streak
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">{combo}</div>
              </div>

              <div className="rounded-2xl border bg-muted/50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Energy
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {running ? "SMASH" : "READY"}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-sm transition-colors duration-500 ${reminderStyle}`}>
            <div className="text-sm font-semibold text-foreground">Fighting</div>
            <p className="mt-3 text-sm leading-6 text-foreground/80">
              {REMINDER_QUOTES[reminderIndex]}
            </p>
          </div>
        </div>
      </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Button className="cursor-pointer rounded-xl" onClick={startSnakeGame}>
                <Sparkles className="mr-2 h-4 w-4" />
                {snakeRunning ? "Restart Round" : snakeOver ? "Play Again" : "Start Round"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Score
                </div>
                <div className="mt-1 text-2xl font-black text-foreground">{snakeScore}</div>
              </div>

              <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Best
                </div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-black text-foreground">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  {snakeBestScore}
                </div>
              </div>

              <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Length
                </div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-black text-foreground">
                  <span className="text-xl leading-none">🐍</span>
                  {snake.length}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="text-sm font-semibold text-foreground">Snake</div>
              </div>

              <div className="relative flex h-[560px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(253,164,175,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(196,181,253,0.2),_transparent_35%),linear-gradient(180deg,#fff1f2_0%,#fdf2f8_40%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(129,140,248,0.18),_transparent_35%),linear-gradient(180deg,#3b0764_0%,#581c87_35%,#1e1b4b_100%)]">
                <div className="relative aspect-square w-[min(78vw,520px)] rounded-[32px] border border-white/45 bg-white/45 p-4 shadow-[0_26px_50px_rgba(236,72,153,0.16)] backdrop-blur dark:border-white/10 dark:bg-slate-950/45">
                  <div className="absolute inset-4 rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />

                  {snake.slice(1).map((segment, index) => (
                    <div
                      key={`${segment.x}-${segment.y}-${index}`}
                      className="absolute z-10 rounded-[18px] bg-emerald-300 shadow-[0_10px_22px_rgba(16,185,129,0.22)] transition-all duration-100 dark:bg-emerald-800"
                      style={{
                        left: `calc(${((segment.x + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 16px)`,
                        top: `calc(${((segment.y + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 16px)`,
                        width: "32px",
                        height: "32px",
                        opacity: Math.max(0.45, 1 - index * 0.08),
                      }}
                    />
                  ))}

                  {snake[0] && (
                    <div
                      className="absolute z-20 rounded-[18px] bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-100"
                      style={{
                        left: `calc(${((snake[0].x + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 18px)`,
                        top: `calc(${((snake[0].y + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 18px)`,
                        width: "36px",
                        height: "36px",
                      }}
                    >
                      <div className="relative h-full w-full">
                        <div className="absolute left-[8px] top-[10px] h-[5px] w-[5px] rounded-full bg-slate-950/75" />
                        <div className="absolute right-[8px] top-[10px] h-[5px] w-[5px] rounded-full bg-slate-950/75" />
                        <div className="absolute left-1/2 top-[20px] h-[6px] w-[14px] -translate-x-1/2 rounded-full bg-emerald-950/25" />
                      </div>
                    </div>
                  )}

                  <div
                    className="absolute z-0 rounded-full bg-pink-300 shadow-[0_0_22px_rgba(244,114,182,0.4)] transition-all duration-100 dark:bg-pink-500"
                    style={{
                      left: `calc(${((snakeFood.x + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 14px)`,
                      top: `calc(${((snakeFood.y + 0.5) / SNAKE_BOARD_SIZE) * 100}% - 14px)`,
                      width: "28px",
                      height: "28px",
                    }}
                  >
                    <div className="absolute inset-[6px] rounded-full bg-white/40" />
                  </div>
                </div>

                {!snakeRunning && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <div className="rounded-[32px] border border-white/45 bg-white/75 px-8 py-6 shadow-[0_26px_50px_rgba(236,72,153,0.16)] backdrop-blur dark:border-white/10 dark:bg-slate-950/65">
                      <div className="text-5xl">🐍</div>
                      <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">
                        {snakeOver ? "Game Over" : "Ready to Slither?"}
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                        Use arrow keys or WASD to move. Eat the pink food, grow longer, and avoid walls or your own tail.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
                <div className="text-sm font-semibold text-foreground">How it works</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>1. Start the round.</p>
                  <p>2. Use arrow keys or WASD to control the snake.</p>
                  <p>3. Eat pink food, grow longer, and stay alive.</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
                <div className="text-sm font-semibold text-foreground">Mood Reset</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Direction
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground">
                      {snakeDirection.toUpperCase()}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Status
                    </div>
                    <div className="mt-2 text-2xl font-black text-foreground">
                      {snakeRunning ? "FLOW" : snakeOver ? "RETRY" : "READY"}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-sm transition-colors duration-500 ${reminderStyle}`}>
                <div className="text-sm font-semibold text-foreground">Fighting</div>
                <p className="mt-3 text-sm leading-6 text-foreground/80">
                  {REMINDER_QUOTES[reminderIndex]}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
