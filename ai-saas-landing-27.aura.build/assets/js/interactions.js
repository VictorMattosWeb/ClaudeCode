// Word carousel typewriter for hero, reveal-up IntersectionObserver, and lucide icon initialization

// Lucide icon renderer
lucide.createIcons({
          attrs: {
              'stroke-width': 1.5
          }
      });

// Hero typewriter and global reveal-up observer
(function(){const words=['productive.','efficient.','fast.','successful.','unstoppable.','dangerous.'];let currentWordIndex=0;let currentWord='';let isDeleting=false;const wordElement=document.getElementById('word-carousel');if(!wordElement)return;function type(){const fullWord=words[currentWordIndex];if(isDeleting){currentWord=fullWord.substring(0,currentWord.length-1);}else{currentWord=fullWord.substring(0,currentWord.length+1);}wordElement.textContent=currentWord;let typeSpeed=80;if(isDeleting)typeSpeed/=2;if(!isDeleting&&currentWord===fullWord){if(currentWordIndex===words.length-1){setTimeout(()=>{wordElement.classList.remove('animate-blink');wordElement.style.borderRight='none';},3000);return;}typeSpeed=1500;isDeleting=true;}else if(isDeleting&&currentWord===''){isDeleting=false;currentWordIndex++;typeSpeed=500;}setTimeout(type,typeSpeed);}wordElement.textContent='';setTimeout(type,1000);})();

      document.addEventListener("DOMContentLoaded", () => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.style.animationPlayState = 'running';
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.reveal-up').forEach((el) => {
          el.style.animationPlayState = 'paused';
          observer.observe(el);
        });
      });

// Secondary reveal-up observer (re-runs after hydration)
setTimeout(() => {
          const newObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                newObserver.unobserve(entry.target);
              }
            });
          }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
          document.querySelectorAll('.reveal-up').forEach((el) => {
            if (window.getComputedStyle(el).animationPlayState === 'paused' || el.style.animationPlayState !== 'running') {
              el.style.animationPlayState = 'paused';
              newObserver.observe(el);
            }
          });
        }, 100);
