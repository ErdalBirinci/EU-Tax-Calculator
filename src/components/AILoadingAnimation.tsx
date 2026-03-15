import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Brain, Cpu, Search } from 'lucide-react';

export const AILoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed min-h-[400px]">
      <div className="relative mb-8">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center"
        >
          <Brain className="w-12 h-12 text-blue-600" />
        </motion.div>
        
        <motion.div
          animate={{
            x: [0, 40, 0, -40, 0],
            y: [0, -40, 0, 40, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-0 left-0 w-full h-full"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-md border border-slate-100">
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
        </motion.div>

        <motion.div
          animate={{
            rotate: [360, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-0 left-0 w-full h-full"
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 p-2 bg-white rounded-lg shadow-md border border-slate-100">
            <Cpu className="w-4 h-4 text-green-500" />
          </div>
        </motion.div>
      </div>

      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Search className="w-5 h-5 text-blue-600 animate-pulse" />
          AI is calculating for you...
        </h3>
        <p className="text-slate-500 max-w-xs mx-auto">
          Analyzing local tax laws, social security rates, and cost of living data across Europe.
        </p>
      </div>

      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-2 h-2 bg-blue-600 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};
