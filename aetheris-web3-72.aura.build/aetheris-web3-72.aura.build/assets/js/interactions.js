// preloader: fakes a load-bar progress, then slides the preloader up via GSAP
const preloader = document.getElementById('preloader');
const loaderBar = document.getElementById('loader-bar');

let width = 0;
const loadInterval = setInterval(() => {
  width += Math.random() * 15;
  if (width > 100) width = 100;
  loaderBar.style.width = width + '%';

  if (width === 100) {
    clearInterval(loadInterval);
    gsap.to(preloader, {
      yPercent: -100,
      duration: 1,
      ease: "power4.inOut",
      delay: 0.5,
      onComplete: initSite
    });
  }
}, 100);

function initSite() {
  initAnimations();
}

// GSAP + ScrollTrigger: hero entrance, generic .reveal sections, token chart stroke draw, and number count-up
function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.hero-anim', {
    y: 0,
    opacity: 1,
    duration: 1,
    stagger: 0.1,
    ease: "power3.out"
  });

  const reveals = document.querySelectorAll('.reveal');
  reveals.forEach(el => {
    gsap.fromTo(el,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          end: "bottom 10%",
          toggleActions: "play reverse play reverse"
        }
      }
    );
  });

  const tokenRing = document.querySelector('.token-chart-ring');
  if (tokenRing) {
    gsap.to(tokenRing, {
      strokeDashoffset: 100,
      duration: 2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: '#token',
        start: "top 70%",
        toggleActions: "play reverse play reverse"
      }
    });
  }

  const tokenStats = document.querySelectorAll('.token-stat-number');
  tokenStats.forEach(stat => {
    const target = parseFloat(stat.getAttribute('data-target'));
    gsap.to(stat, {
      innerText: target,
      duration: 2,
      snap: { innerText: 0.1 },
      ease: "power1.out",
      scrollTrigger: {
        trigger: '#token',
        start: "top 70%",
        toggleActions: "play reverse play reverse"
      }
    });
  });
}

// Lenis smooth scroll: wraps native scroll with ease-out curve, stepped via rAF
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true
});
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
