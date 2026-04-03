// import React, { useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { gsap } from 'gsap';

// const mouthShape1 = "M149 115.7c-4.6 3.7-6.6 9.8-5 15.6.1.5.3 1.1.5 1.6.6 1.5 2.4 2.3 3.9 1.7l11.2-4.4 11.2-4.4c1.5-.6 2.3-2.4 1.7-3.9-.2-.5-.4-1-.7-1.5-2.8-5.2-8.4-8.3-14.1-7.9-3.7.2-5.9 1.1-8.7 3.2z";
// const mouthShape2 = "M161.2 118.9c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-1 .4-2 1.1-2.7.7-.8 1.8-1.3 2.9-1.3 2.2 0 4 1.7 4 4z";
// const mouthShape4 = "M149.2 116.7c-4.6 3.7-6.7 8.8-5.2 14.6.1.3.1.5.2.8.6 1.5 2.4 2.3 3.9 1.7l11.2-4.4 11.2-4.4c1.5-.6 2.3-2.4 1.7-3.9-.1-.3-.2-.5-.4-.7-2.8-5.2-8.2-7.2-14-6.9-3.6.2-5.9 1.1-8.6 3.2z";

// export default function NotFoundPage() {
//     const navigate = useNavigate();
//     const yetiRef = useRef(null);

//     useEffect(() => {
//         const ctx = gsap.context(() => {
//             const furLightColor = "#FFF";
//             const furDarkColor = "#67b1e0";
//             const skinLightColor = "#ddf1fa";
//             const skinDarkColor = "#88c9f2";
//             const lettersSideLight = "#3A7199";
//             const lettersSideDark = "#051d2c";
//             const lettersFrontLight = "#67B1E0";
//             const lettersFrontDark = "#051d2c";
//             const lettersStrokeLight = "#265D85";
//             const lettersStrokeDark = "#031219";

//             const goDark = () => {
//                 gsap.set('#light', { visibility: "hidden" });
//                 gsap.set('.lettersSide', { fill: lettersSideDark, stroke: lettersStrokeDark });
//                 gsap.set('.lettersFront', { fill: lettersFrontDark, stroke: lettersStrokeDark });
//                 gsap.set('#lettersShadow', { opacity: 0.05 });
//                 gsap.set('.hlFur', { fill: furDarkColor });
//                 gsap.set('.hlSkin', { fill: skinDarkColor });
//             };
//             const goLight = () => {
//                 gsap.set('#light', { visibility: "visible" });
//                 gsap.set('.lettersSide', { fill: lettersSideLight, stroke: lettersStrokeLight });
//                 gsap.set('.lettersFront', { fill: lettersFrontLight, stroke: lettersStrokeLight });
//                 gsap.set('#lettersShadow', { opacity: 0.2 });
//                 gsap.set('.hlFur', { fill: furLightColor });
//                 gsap.set('.hlSkin', { fill: skinLightColor });
//             };

//             gsap.set(['#fingersFrontL', '#fingersFrontR'], { visibility: "visible" });

//             const chatterTL = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
//             chatterTL.to(['#mouthBG', '#mouthPath', '#mouthOutline'], { duration: 0.1, attr: { d: mouthShape4 }, ease: "none" }, 0)
//                 .to('#chin', { duration: 0.1, y: 1.5, ease: "none" }, 0);

//             const yetiTL = gsap.timeline({ repeat: -1 });
//             yetiTL.add(() => chatterTL.play(), 0)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 2.5)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 2.575)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 2.65)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 2.725)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 2.8)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 2.875)
//                 .add(goLight, 3.2).add(goDark, 3.3).add(goLight, 3.4)
//                 .add(() => { chatterTL.pause(); gsap.to(['#mouthBG', '#mouthPath', '#mouthOutline'], { duration: 0.1, attr: { d: mouthShape1 } }); }, 3.2)
//                 .to(['#mouthBG', '#mouthPath', '#mouthOutline'], { duration: 0.25, attr: { d: mouthShape2 } }, 5)
//                 .to(['#tooth1', '#tooth2', '#tooth3'], { duration: 0.1, y: -5 }, 5)
//                 .to(['#armR', '#fingersFrontR'], { duration: 0.5, x: 10, y: 30, rotation: 10, transformOrigin: "bottom center", ease: "power2.out" }, 4)
//                 .to(['#eyeL', '#eyeR'], { duration: 0.25, scale: 1.4, transformOrigin: "center center" }, 5)
//                 .add(goDark, 8).add(goLight, 8.1).add(goDark, 8.3).add(goLight, 8.4).add(goDark, 8.6)
//                 .to(['#mouthBG', '#mouthPath', '#mouthOutline'], { duration: 0.25, attr: { d: mouthShape1 } }, 9)
//                 .to(['#tooth1', '#tooth2', '#tooth3'], { duration: 0.1, y: 0 }, 9)
//                 .to(['#armR', '#fingersFrontR'], { duration: 0.5, x: 0, y: 0, rotation: 0, transformOrigin: "bottom center", ease: "power2.out" }, 9)
//                 .to(['#eyeL', '#eyeR'], { duration: 0.25, scale: 1, transformOrigin: "center center" }, 9)
//                 .add(() => chatterTL.play(), 9.25)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 11.5)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 11.575)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 11.65)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 11.725)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 7, ease: "none" }, 11.8)
//                 .to(['#armL', '#flashlightFront', '#fingersFrontL'], { duration: 0.075, x: 0, ease: "none" }, 11.875);
//             goDark();
//         }, yetiRef);
//         return () => ctx.revert();
//     }, []);

//     return (
//         <div className="min-h-screen bg-[#09334f] flex flex-col items-center justify-center relative overflow-hidden" ref={yetiRef}>
//             <style>{`
//                 #yetiSVG, #lightSVG { position: absolute; width: 600px; height: 470px; top: 50%; left: 50%; transform: translate(-80%, -50%) scale(1.8); pointer-events: none; }
//                 @media (max-width: 1024px) { #yetiSVG, #lightSVG { transform: translate(-50%, -70%) scale(1.3); } }
//                 .content { position: relative; z-index: 10; font-family: 'Poppins', sans-serif; color: #FFF; width: 100%; max-width: 600px; margin-left: auto; padding-right: 5rem; text-shadow: 0 4px 10px rgba(0,0,0,0.3); }
//                 @media (max-width: 768px) { .content { padding: 2rem; margin-top: 250px; text-align: center; margin-left: 0; } }
//             `}</style>

//             <div className="absolute inset-0">
//                 <svg id="yetiSVG" viewBox="0 0 600 470" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
//                     <defs><linearGradient id="flashlightGrad" x1="126.5" x2="90.5" y1="176.5" y2="213.5" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#333" /><stop offset="1" stopColor="#333" /></linearGradient></defs>
//                     <path fill="#24658F" d="M0 0h600v470H0z" />
//                     <g id="pillow">
//                         <path fill="#09334F" d="M241.3 124.6c-52.9 28.6-112.6 48-181.8 54.4-40.9 6.8-64.6-82.3-31.9-106.6C84 43.8 144.8 26.2 209.4 18c32.8 13 48.5 75.3 31.9 106.6z" />
//                         <path fill="none" stroke="#001726" strokeWidth="2.5" d="M52.8 91.3c10 7.4 25.4 50.7 16.1 65.8" />
//                         <path fill="#09334F" stroke="#001726" strokeWidth="2.5" d="M201.9 21.9c4.9-8 14.1-11.3 20.6-7.3s7.7 13.7 2.8 21.7" /><path fill="#09334F" stroke="#001726" strokeWidth="2.5" d="M242.1 103.1c1.8.3 3.6.9 5.3 1.8 8.4 4.1 12.6 13 9.3 19.8s-12.9 9-21.3 4.9c-1.9-.9-3.6-2.1-5-3.4" /><path fill="#09334F" stroke="#001726" strokeWidth="2.5" d="M70.3 172c.2 1.4.2 2.8.1 4.3-.8 9.4-8.3 16.4-16.7 15.6S39.2 183 40 173.7c.1-1.6.5-3.1 1-4.5" /><path fill="#09334F" stroke="#001726" strokeWidth="2.5" d="M20.9 85.1c-4.1-5-5.1-11.6-2.1-16.9 4.1-7.2 14-9.2 22.1-4.6 3.7 2.1 6.4 5.2 7.9 8.6" />
//                     </g>
//                     <g id="yeti">
//                         <path id="bodyBG" fill="#67B1E0" d="M80.9 291.4l-17.1-72.8c-6.3-27 10.4-54 37.4-60.3l93.1-29.6c26.5-8.1 54.6 6.8 62.7 33.3l21.9 71.5" />
//                         <path className="hlFur" id="hlBody" fill="#FFF" d="M67.1 232.7l-9.1-38.7c15.6-8.7 27.7-23.7 38-38.7 5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7 3.6-1.5 6.5-4.1 9.3-6.9 6.5-6.5 12-14 18-21-6.4-.6-12.9 0-19.4 2l-93.1 29.6c-27 6.3-43.7 33.4-37.4 60.3l3.2 14.1z" />
//                         <path fill="#67B1E0" d="M197.5 132.4l-11.2-47.9c-6.3-26.7-32.7-44.1-59.5-38.2-27.4 6-44.5 33.1-38.1 60.3l13.6 56.2" />
//                         <path className="hlFur" id="hlHead" fill="#FFF" d="M100.4 132.3l7.4 29.8 89.7-28.8-11.4-48.9c-1.6-6.8-4.5-12.9-8.4-18.3-9.6-7.9-28.5-12.9-46.9-8.5-24.9 5.9-34.5 23.6-38.1 37.9-.8.8-3.8 3-5.1 5.4.2 1.9.5 3.7 1 5.6l7 28.8 4.8-3z" />
//                         <g><ellipse cx="85.8" cy="120.4" fill="#88C9F2" rx="11.5" ry="11.5" transform="rotate(-66.2 85.8 120.4)" /><path className="hlSkin" fill="#DDF1FA" d="M80.4 122.2c-1.3-5.5 1.6-11.1 6.6-13.2-1.3-.1-2.6-.1-3.9.3-6.2 1.5-10 7.7-8.5 13.9s7.7 10 13.9 8.5c.7-.2 1.3-.4 1.9-.6-4.7-.6-8.9-4-10-8.9z" /><ellipse cx="85.8" cy="120.4" fill="none" stroke="#265D85" strokeWidth="2.5" rx="11.5" ry="11.5" transform="rotate(-66.2 85.8 120.4)" /><path className="hlFur" fill="#FFF" d="M106 130.3l-12 3.6 1.2-11.4-6.3-.1 6-12h-5.4l9.6-8.4z" /><path className="hlFur" fill="#FFF" stroke="#265D85" strokeWidth="2.5" d="M92.1 96.4c-5.1 5.9-8.4 11.7-10 17 4.2-1.2 8.5-2.2 12.8-3-4.2 4.8-6.7 9.5-7.6 13.8 2.7-.7 5.4-1.3 8-1.7-2.3 4.8-2.8 9.2-1.7 13.3 1.4-1 4-2.4 6.1-3.4" /></g>
//                         <path className="hlSkin" id="face" fill="#DDF1FA" d="M169.1 70.4l7.3 23.4c9.4 26.8-1.8 45-20 50.7s-37.8-5.1-45.8-30.1L103.3 91" />
//                         <path id="chin" fill="none" stroke="#265D85" strokeWidth="2.5" d="M152.4 147.5c3.8 1 8 1.4 12.3 1.1-.5-1.4-1-2.9-1.6-4.3 3.8.6 7.9.7 12.1.1l-3.3-4.8c3.1-.6 6.3-1.6 9.5-3.1-1.4-1.6-2.8-3.1-4.2-4.6" />
//                         <g id="eyes"><g id="eyeL"><circle cx="135.9" cy="105.3" r="3.5" fill="#265D85" /><circle cx="133.7" cy="103.5" r="1" fill="#FFF" /></g><g id="eyeR"><circle cx="163.2" cy="96.3" r="3.5" fill="#265D85" /><circle cx="160.9" cy="94.5" r="1" fill="#FFF" /></g></g>
//                         <path id="nose" fill="#265D85" d="M149.3 101.2l4.4-1.6c1.8-.6 3.6 1 3.1 2.9l-1.1 3.9c-.4 1.6-2.3 2.2-3.6 1.3l-3.3-2.3c-1.7-1.1-1.3-3.5.5-4.2z" />
//                         <g id="mouth">
//                             <path id="mouthBG" fill="#265D85" d={mouthShape1} /><clipPath id="mCP"><path d={mouthShape1} /></clipPath>
//                             <g clipPath="url(#mCP)">
//                                 <ellipse cx="160.8" cy="133.2" fill="#CC4A6C" rx="13" ry="8" transform="rotate(-21.6 160.8 133.2)" />
//                                 <path id="tooth1" fill="#FFF" d="M161.5 116.1l-3.7 1.5c-1 .4-2.2-.1-2.6-1.1l-1.5-3.7 7.4-3 1.5 3.7c.5 1 0 2.2-1.1 2.6z" />
//                                 <path id="tooth2" fill="#FFF" d="M151.8 128.9l-1.9.7c-1 .4-1.5 1.6-1.1 2.6l1.1 2.8 5.6-2.2-1.1-2.8c-.5-1-1.6-1.5-2.6-1.1z" /><path id="tooth3" fill="#FFF" d="M158.3 126.3l-1.9.7c-1 .4-1.5 1.6-1.1 2.6l1.1 2.8 5.6-2.2-1.1-2.8c-.5-1-1.6-1.5-2.6-1.1z" />
//                             </g>
//                             <path id="mouthOutline" fill="none" stroke="#265D85" strokeWidth="2.5" d={mouthShape1} />
//                         </g>
//                         <g id="armR">
//                             <path className="hlSkin" fill="#DDF1FA" d="M158.4 116.9l-.7.3c-3.7 1.5-5.5 5.7-4.1 9.4l1.2 2.9c1.7 4.4 6.7 6.5 11.1 4.8l1.4-.5" /><path fill="#88C9F2" d="M162.3 128.6l18.6 46.7 37.2-14.8-17.9-44.8" /><path className="hlSkin" fill="#DDF1FA" d="M206.5 130.7l-5.9-15.1-37.9 13 6.4 17.4c10 1.6 34.6-6.3 37.4-15.3z" />
//                         </g>
//                         <g id="armL">
//                             <path fill="#67B1E0" d="M50.9 156.7c-12 35.8-7.8 69.6 8.3 101.9 12.1 22.7 37 14.1 39.5-11.8v-65l-47.8-25.1z" /><path fill="none" stroke="#265D85" strokeWidth="2.5" d="M50.9 156.7c-12 35.8-7.8 69.6 8.3 101.9 10 22.3 37.3 15.1 39.5-11.8v-65l-47.8-25.1z" />
//                             <path fill="none" stroke="#262626" strokeWidth="20" d="M59.3 143.8l34.3 33.9" /><path className="hlSkin" id="hlHandL" fill="#DDF1FA" d="M101.7 156.9c-5.8-7.2-16.1-9.9-25-5.7-5.9 2.8-9.9 8.1-11.3 14.1l-1-.9-6.2 4.2c5.5 18.1 19.3 25.4 30.4 21l1.2-9.1" />
//                             <path className="hlFur" id="hlArmL" fill="#FFF" d="M98.8 202.8l-1.4-8.7-5.2.7-7.2-11.5-6.8 9-3.9-9.3-7.5 4.8 3.5-11.4-7.1 1.9 2.7-13.5-7.8 4.9c-11.7 26.5-3.6 52.5 1.7 66.6" />
//                         </g>
//                         <g id="flashlightFront">
//                             <path fill="#1A1A1A" d="M83.9 181.4l4.6 26.4 34.6-33.6-24.5-6.2c-8.9-2.6-16.6 3.9-14.7 13.4z" /><path fill="#333" d="M91.9 167.8l20.5 7.4-.5 1.2-21.4-8.2c.5-.2 1-.3 1.4-.4z" /><path d="M86 171.4c-2 2.5-3 6-2.2 10l4.6 26.4 11.4-11.1L86 171.4z" /><path fill="url(#flashlightGrad)" d="M99.1 183.7c-10.6 9.4-13.4 21.4-9 28.5 4.3 6.8 18 3 28.6-6.4s14.9-23.7 8.8-29c-6.9-6.1-17.8-2.6-28.4 6.9z" /><path fill="#B3B3B3" d="M101.6 185.7c-8.2 7.3-11.9 18.2-8.8 23.1 2.6 4.1 13.6-1.1 21.8-8.4s13.6-18.1 9.9-21.6c-4.4-4.2-14.7-.4-22.9 6.9z" />
//                         </g>
//                     </g>
//                     <g id="fingersFrontL" className="hlSkin">
//                         <path fill="#88C9F2" stroke="#265D85" strokeWidth="2.5" d="M146.2 165.1l2.8 11.6c.6 2.7 3.3 4.3 6 3.7s4.3-3.3 3.7-6l-1.6-6.8-6-3.7-4.9 1.2" /><path fill="#88C9F2" stroke="#265D85" strokeWidth="2.5" d="M136.5 167.4l2.8 11.6c.6 2.7 3.3 4.3 6 3.7s4.3-3.3 3.7-6l-2.8-11.6-9.7 2.3z" /><path fill="#88C9F2" stroke="#265D85" strokeWidth="2.5" d="M127.9 174.6l1.6 6.8c.6 2.7 3.3 4.3 6 3.7s4.3-3.3 3.7-6l-2.8-11.6-4.9 1.2c-2.6.5-4.2 3.2-3.6 5.9z" />
//                     </g>
//                     <g id="fingersFrontR" className="hlSkin">
//                         <path fill="#88c9f2" stroke="#265D85" strokeWidth="2.5" d="M207.1 142.5l7.9 8.9c1.8 2.1 5 2.3 7.1.4s2.3-5 .4-7.1l-4.6-5.2-7-.4-3.8 3.4" /><path fill="#88c9f2" stroke="#265D85" strokeWidth="2.5" d="M199.6 149.1l7.9 8.9c1.8 2.1 5 2.3 7.1.4s2.3-5 .4-7.1l-7.9-8.9-7.5 6.7z" /><path fill="#88c9f2" stroke="#265D85" strokeWidth="2.5" d="M195.4 159.5l4.6 5.2c1.8 2.1 5 2.3 7.1.4s2.3-5 .4-7.1l-7.9-8.9-3.7 3.3c-2.1 1.9-2.3 5-.5 7.1z" />
//                     </g>
//                     <g id="blanket" fill="#09334F">
//                         <path d="M1.2 271.4c5.4-9.4 11.8-18.3 21.2-23.4s22.5-5.5 33.7-8.8q32.7-9.75 50.3-43.9c5.5-8 10.9-16.4 18.3-22.7 13.1-11.2 31.3-14.8 48.6-15 4.9 0 9.9.1 14.5-1.7s6.5-4.1 9.3-6.9H700v570H0V281.6z" />
//                     </g>
//                 </svg>
//                 <svg id="lightSVG" viewBox="0 0 600 470" xmlns="http://www.w3.org/2000/svg">
//                     <filter id="white-glow"><feGaussianBlur stdDeviation="8" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
//                     <g id="light" style={{ visibility: "hidden" }}><path filter="url(#white-glow)" fill="#F8FFE8" d="M122.2 177.4c-5.2-1.6-13.6 2.1-20.6 8.3-7.7 6.8-11.4 16.8-9.3 22.1L421 1683h1534V733L122.2 177.4z" /></g>
//                     <g id="four04">
//                         <path className="lettersSide" fill="#3A7199" stroke="#265D85" strokeWidth="2.5" d="M269.2 316l-17.9 6 15.4.8 19.2-6.4zM220.3 371l12.4 37.8 14 7.4-13.3-40.7z" />
//                         <path className="lettersFront" fill="#67B1E0" stroke="#265D85" strokeWidth="2.5" d="M266.7 322.8l19.2-6.5 12.1 37.2-19.2 6.5 13.2 40.6-45.2 15.6-13.3-40.7-77.5 26.4-11.5-34.8 26.9-128.8 61.5-19.9 33.8 104.4z" />
//                         <path className="lettersSide" fill="#3A7199" stroke="#265D85" strokeWidth="2.5" d="M548.6 448.8l-18.7-2.8 13.4 7.7 20.1 2.9zM480.2 475.8l-6 39.3 9.2 13 6.4-42.4z" />
//                         <path className="lettersFront" fill="#67B1E0" stroke="#265D85" strokeWidth="2.5" d="M543.3 453.7l20.1 2.9-6 38.6-20-2.8-6.5 42.1-47.4-6.5 6.5-42.3-81.1-11.4 5.4-36.2 82.2-102.8 63.8 9.9-17 108.5z" />
//                     </g>
//                 </svg>
//             </div>

//             <div className="content">
//                 <h3 className="font-black">Hello?? Is somebody there?!?</h3>
//                 <p>We know it’s scary, but the page you’re trying to reach can’t be found. Perhaps it was just a bad <span>link</span> dream?</p>
//                 <div className="flex gap-4 mt-8">
//                     <button onClick={() => navigate(-1)} className="px-8 py-3 bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white font-black rounded-2xl transition-all cursor-pointer backdrop-blur-md">Return Back</button>
//                     <button onClick={() => navigate('/')} className="px-8 py-3 bg-[#67B1E0] text-white font-black rounded-2xl shadow-xl shadow-[#67B1E0]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer">Go to Dashboard</button>
//                 </div>
//             </div>
//         </div>
//     );
// }
// ... [Yeti code ends above] ...

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden font-['Poppins']">
            {/* Subtle Watermark Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#003366 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
                {/* Portal Blue Ghost Icon */}
                <div className="mb-8 p-10 bg-[#003366]/5 rounded-full border border-[#003366]/10">
                    <Ghost size={140} strokeWidth={1} className="text-[#003366]" />
                </div>

                <h1 className="text-[#003366] text-8xl md:text-9xl font-black mb-4 tracking-tighter opacity-10">
                    404
                </h1>
                
                <h3 className="text-[#003366] text-3xl md:text-4xl font-bold mb-6 -mt-16 relative z-20">
                    Lost in Translation
                </h3>
                
                <p className="text-[#003366]/60 text-lg md:text-xl mb-12 leading-relaxed max-w-md">
                    The page you were looking for doesn't exist. Don't worry, even the best interns get lost sometimes.
                </p>

                <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center justify-center gap-2 px-10 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-[#003366] font-bold rounded-2xl transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                        <ArrowLeft size={20} />
                        Return Back
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center justify-center gap-2 px-10 py-4 bg-[#003366] text-white font-bold rounded-2xl shadow-xl shadow-[#003366]/20 hover:scale-[1.02] hover:bg-[#002244] transition-all active:scale-95 cursor-pointer"
                    >
                        <Home size={20} />
                        Go to Dashboard
                    </button>
                </div>
                
                <div className="mt-16 text-gray-400 text-sm font-medium tracking-widest ">
                    Internship Management System
                </div>
            </div>
        </div>
    );
}
