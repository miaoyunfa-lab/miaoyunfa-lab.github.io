(() => {
  const carousels = document.querySelectorAll('[data-carousel]');

  carousels.forEach((carousel) => {
    let slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    let details = Array.from(carousel.querySelectorAll('[data-carousel-detail]'));
    let dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let timer = null;
    let expiryTimer = null;

    const getExpiryTime = (element) => {
      const value = element.dataset.carouselExpiresAt;
      if (!value) return null;

      const timestamp = Date.parse(value);
      return Number.isNaN(timestamp) ? null : timestamp;
    };

    const showSlide = (index) => {
      if (slides.length === 0) return;
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
      });

      details.forEach((detail, detailIndex) => {
        const isActive = detailIndex === activeIndex;
        detail.classList.toggle('is-active', isActive);
        detail.setAttribute('aria-hidden', String(!isActive));
      });

      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', String(isActive));
      });
    };

    const stopAutoplay = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const startAutoplay = () => {
      if (reduceMotion || slides.length < 2) return;
      stopAutoplay();
      timer = window.setInterval(() => showSlide(activeIndex + 1), 5500);
    };

    const removeExpiredSlides = () => {
      const expiredIndexes = slides
        .map((slide, index) => ({ index, expiry: getExpiryTime(slide) }))
        .filter(({ expiry }) => expiry !== null && Date.now() >= expiry)
        .map(({ index }) => index);

      if (expiredIndexes.length === 0) return false;

      const activeWasRemoved = expiredIndexes.includes(activeIndex);
      const removedBeforeActive = expiredIndexes.filter((index) => index < activeIndex).length;

      stopAutoplay();
      expiredIndexes.slice().reverse().forEach((index) => {
        slides[index].remove();
        if (details[index]) details[index].remove();
        if (dots[index]) dots[index].remove();
      });

      slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
      details = Array.from(carousel.querySelectorAll('[data-carousel-detail]'));
      dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));

      if (slides.length === 0) {
        carousel.hidden = true;
        return true;
      }

      activeIndex = activeWasRemoved
        ? Math.min(Math.max(activeIndex - removedBeforeActive, 0), slides.length - 1)
        : Math.max(activeIndex - removedBeforeActive, 0);
      showSlide(activeIndex);
      startAutoplay();
      return true;
    };

    const scheduleExpiryCheck = () => {
      if (expiryTimer) window.clearTimeout(expiryTimer);

      const nextExpiry = slides
        .map(getExpiryTime)
        .filter((expiry) => expiry !== null)
        .sort((a, b) => a - b)[0];

      if (nextExpiry === undefined) return;

      const delay = Math.max(0, nextExpiry - Date.now() + 25);
      expiryTimer = window.setTimeout(() => {
        removeExpiredSlides();
        scheduleExpiryCheck();
      }, delay);
    };

    removeExpiredSlides();
    if (slides.length === 0) return;

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const currentIndex = dots.indexOf(dot);
        if (currentIndex < 0) return;
        showSlide(currentIndex);
        startAutoplay();
      });
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    showSlide(0);
    startAutoplay();
    scheduleExpiryCheck();
  });
})();
