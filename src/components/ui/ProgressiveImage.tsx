import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string; // used for wrapper
  imgClassName?: string; // used for inner img
}

export default function ProgressiveImage({
  src,
  alt,
  className,
  imgClassName,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [src]);

  // Extract only the props that are valid for <img> to avoid motion conflicts
  const { onDrag, onDragStart, onDragEnd, onAnimationStart, ...safeProps } = props as any;

  return (
    <div
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className || ""}`}
    >
      {!isLoaded && (
        <motion.div
          className="absolute inset-0 bg-gray-300 dark:bg-gray-700/50 animate-pulse"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      <motion.img
        src={src}
        alt={alt || ""}
        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${isLoaded ? "opacity-100" : "opacity-0"} ${imgClassName || ""}`}
        {...safeProps}
      />
    </div>
  );
}
