"use client";


import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";


export default function WomensDayBackground() {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showWish, setShowWish] = useState(false);
  const [fadeContent, setFadeContent] = useState(false);
  const [hideAll, setHideAll] = useState(false);


  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();


    if (month === 3 && day === 8) {
      setShow(true);


      const t1 = setTimeout(() => setAnimate(true), 200);
      const t2 = setTimeout(() => setShowWish(true), 4200);
      const t3 = setTimeout(() => setFadeContent(true), 8800);
      const t4 = setTimeout(() => setHideAll(true), 11500);


      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, []);


  if (!show || hideAll) return null;


  const petals = [
    { left: "50%", top: "50%", dx: "-180px", dy: "-120px", delay: "0ms", rotate: "-25deg" },
    { left: "50%", top: "50%", dx: "-120px", dy: "-180px", delay: "140ms", rotate: "18deg" },
    { left: "50%", top: "50%", dx: "0px", dy: "-210px", delay: "260ms", rotate: "-12deg" },
    { left: "50%", top: "50%", dx: "130px", dy: "-170px", delay: "380ms", rotate: "22deg" },
    { left: "50%", top: "50%", dx: "190px", dy: "-90px", delay: "500ms", rotate: "-15deg" },
    { left: "50%", top: "50%", dx: "210px", dy: "10px", delay: "620ms", rotate: "12deg" },
    { left: "50%", top: "50%", dx: "170px", dy: "120px", delay: "740ms", rotate: "-20deg" },
    { left: "50%", top: "50%", dx: "40px", dy: "190px", delay: "860ms", rotate: "15deg" },
    { left: "50%", top: "50%", dx: "-90px", dy: "170px", delay: "980ms", rotate: "-18deg" },
    { left: "50%", top: "50%", dx: "-180px", dy: "90px", delay: "1100ms", rotate: "20deg" },
  ];


  return (
    <>
      <style jsx>{`
        @keyframes bloom {
          0% {
            transform: scale(0.12) rotate(-18deg);
            opacity: 0;
            filter: blur(6px);
          }
          55% {
            transform: scale(1.12) rotate(6deg);
            opacity: 1;
            filter: blur(0);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0);
          }
        }


        @keyframes petalFly {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0.2)
              rotate(0deg);
            opacity: 0;
          }
          18% {
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--dx), var(--dy))
              scale(1) rotate(var(--rot));
            opacity: 0;
          }
        }


        @keyframes textIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }


        @keyframes wishIn {
          0% {
            opacity: 0;
            transform: translateY(14px);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }


        @keyframes shine {
          0% {
            background-position: 220% center;
          }
          100% {
            background-position: -220% center;
          }
        }


        @keyframes contentFadeOut {
          0% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.96);
            filter: blur(6px);
          }
        }


        @keyframes bgFadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>


      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-white"
          style={{
            animationName: fadeContent ? "bgFadeOut" : undefined,
            animationDuration: fadeContent ? "2600ms" : undefined,
            animationTimingFunction: fadeContent ? "ease" : undefined,
            animationFillMode: fadeContent ? "forwards" : undefined,
          }}
        />


        <div className="absolute inset-0">
          {petals.map((petal, index) => (
            <div
              key={index}
              className={`absolute transition-opacity duration-300 ${
                animate ? "opacity-100" : "opacity-0"
              }`}
              style={{
                left: petal.left,
                top: petal.top,
                animationName: animate ? "petalFly" : undefined,
                animationDuration: animate ? "2600ms" : undefined,
                animationTimingFunction: animate ? "ease-out" : undefined,
                animationFillMode: animate ? "forwards" : undefined,
                animationDelay: animate ? petal.delay : undefined,
                ["--dx" as any]: petal.dx,
                ["--dy" as any]: petal.dy,
                ["--rot" as any]: petal.rotate,
              }}
            >
              <Flower2 className="h-6 w-6 text-pink-300/80" />
            </div>
          ))}
        </div>


        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center"
          style={{
            animationName: fadeContent ? "contentFadeOut" : undefined,
            animationDuration: fadeContent ? "2200ms" : undefined,
            animationTimingFunction: fadeContent ? "ease" : undefined,
            animationFillMode: fadeContent ? "forwards" : undefined,
          }}
        >
          <div
            className="drop-shadow-sm"
            style={{
              animationName: animate ? "bloom" : undefined,
              animationDuration: animate ? "1800ms" : undefined,
              animationTimingFunction: animate
                ? "cubic-bezier(.2,.9,.2,1)"
                : undefined,
              animationFillMode: animate ? "forwards" : undefined,
            }}
          >
            <Flower2 className="h-28 w-28 text-pink-400 md:h-36 md:w-36" />
          </div>


          <div
            className={`transition-opacity duration-700 ${
              animate ? "opacity-100" : "opacity-0"
            }`}
            style={{
              animationName: animate ? "textIn" : undefined,
              animationDuration: animate ? "1400ms" : undefined,
              animationTimingFunction: animate ? "ease-out" : undefined,
              animationDelay: animate ? "900ms" : undefined,
              animationFillMode: animate ? "both" : undefined,
            }}
          >
            <div
              className="bg-[linear-gradient(90deg,#ec4899_15%,#f9a8d4_35%,#ffffff_50%,#f9a8d4_65%,#ec4899_85%)] bg-[length:220%_100%] bg-clip-text text-2xl font-semibold tracking-wide text-transparent md:text-3xl"
              style={{
                animationName: animate ? "shine" : undefined,
                animationDuration: animate ? "3600ms" : undefined,
                animationTimingFunction: animate ? "linear" : undefined,
                animationDelay: animate ? "1400ms" : undefined,
                animationIterationCount: animate ? "infinite" : undefined,
              }}
            >
              Happy Women&apos;s Day
            </div>
          </div>


          {showWish && (
            <div
              style={{
                animationName: "wishIn",
                animationDuration: "1400ms",
                animationTimingFunction: "ease-out",
                animationFillMode: "forwards",
              }}
            >
              <p
                className="max-w-xl bg-[linear-gradient(90deg,#ec4899_15%,#f9a8d4_35%,#ffffff_50%,#f9a8d4_65%,#ec4899_85%)] bg-[length:220%_100%] bg-clip-text text-2xl font-medium leading-relaxed text-transparent md:text-base"
                style={{
                  animationName: "shine",
                  animationDuration: "3600ms",
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                }}
              >
                1 ngày rạng rỡ, zui zẻ zui zẻ neoo hehehe
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
