import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

// Draggable + InertiaPlugin are only used by the gear shifter, which imports them lazily.
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, CustomEase, useGSAP);

// One motion grammar for the whole route.
// "road" = strong ease-out (things arriving), "steer" = ease-in-out (things moving on screen).
CustomEase.create("road", "0.23, 1, 0.32, 1");
CustomEase.create("steer", "0.77, 0, 0.175, 1");
gsap.defaults({ ease: "road", duration: 0.9 });

export { gsap, ScrollTrigger, DrawSVGPlugin, useGSAP };
