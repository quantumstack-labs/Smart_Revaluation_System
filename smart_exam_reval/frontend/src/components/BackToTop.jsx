import { useEffect, useState } from "react";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
  onClick={scrollToTop}
  className="fixed bottom-24 right-5 z-50 rounded-full bg-slate-800 px-4 py-2 text-white shadow-lg hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
>
  ↑
</button>
  );
}

export default BackToTop;