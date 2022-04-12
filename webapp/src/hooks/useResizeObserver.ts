import React from "react";

export default function useResizeObserver(): [
  React.MutableRefObject<HTMLDivElement | null>,
  number,
  number
] {
  const ref = React.useRef<HTMLDivElement>(null);
  const [currentWidth, setCurrentWidth] = React.useState(0);
  const [currentHeight, setCurrentHeight] = React.useState(0);

  const createSetSizeByElement = React.useCallback(
    (el: HTMLDivElement | null) => () => {
      if (el) {
        setCurrentWidth(el.clientWidth);
        setCurrentHeight(el.clientHeight);
      }
    },
    []
  );

  const setSizeByResizeObserverEntry = (entry: ResizeObserverEntry) => {
    setCurrentWidth(entry.contentRect.width);
    setCurrentHeight(entry.contentRect.height);
  };

  React.useEffect(() => {
    const currentRef = ref.current;

    if (currentRef) {
      setCurrentWidth(currentRef.clientWidth);
      setCurrentHeight(currentRef.clientHeight);
    }

    if (window.ResizeObserver) {
      const resizeObserver = new window.ResizeObserver((entries) => {
        if (!entries.length) {
          return;
        }

        setSizeByResizeObserverEntry(entries[0]);
      });

      if (currentRef) {
        resizeObserver.observe(currentRef);
      }

      return () => {
        if (currentRef) {
          resizeObserver.unobserve(currentRef);
        }
      };
    } else {
      const handleResize = createSetSizeByElement(ref.current);
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [createSetSizeByElement]);

  return [ref, currentWidth, currentHeight];
}
