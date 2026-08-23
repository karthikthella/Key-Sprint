import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../theme/f1Constants';

const LINE_HEIGHT_PX = 44; // Exact line height

export default function F1TypingArena({
  passageText = '',
  typedText = '',
  onInputChange,
  disabled = false,
  source = '',
  universe = '',
  leaderWpm = 0,
  userAvgWpm = 60
}) {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const activeCharRef = useRef(null);

  const [currentError, setCurrentError] = useState('');
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  // Sector Timers & Performance State (purple | green | yellow)
  const [startTime, setStartTime] = useState(null);
  const [s1Time, setS1Time] = useState(null);
  const [s2Time, setS2Time] = useState(null);
  const [s1Status, setS1Status] = useState(null); // 'purple' | 'green' | 'yellow'
  const [s2Status, setS2Status] = useState(null);
  const [s3Status, setS3Status] = useState(null);

  // Auto-focus hidden input on load or when race begins
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Reset metrics on new passage
  useEffect(() => {
    setCurrentError('');
    setTotalKeystrokes(0);
    setTotalErrors(0);
    setStartTime(null);
    setS1Time(null);
    setS2Time(null);
    setS1Status(null);
    setS2Status(null);
    setS3Status(null);
  }, [passageText]);

  // Global key listener: typing anywhere directs keystrokes into the arena
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) && e.target !== inputRef.current) {
        return;
      }
      if (!disabled && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled]);

  // BULLETPROOF 3-LINE SCROLL:
  // Keeps the actively typed line ALWAYS in the comfortable middle row (row 2 of 3)
  useEffect(() => {
    if (activeCharRef.current && containerRef.current) {
      const charTop = activeCharRef.current.offsetTop;
      const currentLine = Math.floor(charTop / LINE_HEIGHT_PX);

      const targetScrollTop = Math.max(0, (currentLine - 1) * LINE_HEIGHT_PX);

      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }, [typedText]);

  // Track dynamic F1 sector splits upon reaching 33%, 66%, and 100%
  const passageLength = passageText.length || 1;
  const progressPercent = Math.min(100, Math.round((typedText.length / passageLength) * 100));

  useEffect(() => {
    const now = Date.now();
    if (!startTime && typedText.length > 0) {
      setStartTime(now);
      return;
    }

    if (!startTime) return;

    // Sector 1 Complete (33%)
    if (progressPercent >= 33 && !s1Status) {
      const elapsedMin = (now - startTime) / 60000;
      const s1Chars = Math.round(passageLength * 0.33);
      const s1Wpm = Math.round((s1Chars / 5) / Math.max(0.01, elapsedMin));
      setS1Time(now);

      if (s1Wpm >= Math.max(leaderWpm, 75) && totalErrors === 0) {
        setS1Status('purple'); // Fastest in Session
      } else if (s1Wpm >= (userAvgWpm || 55)) {
        setS1Status('green'); // Personal Best
      } else {
        setS1Status('yellow'); // Slower
      }
    }

    // Sector 2 Complete (66%)
    if (progressPercent >= 66 && !s2Status && s1Time) {
      const elapsedMin = (now - s1Time) / 60000;
      const s2Chars = Math.round(passageLength * 0.33);
      const s2Wpm = Math.round((s2Chars / 5) / Math.max(0.01, elapsedMin));
      setS2Time(now);

      if (s2Wpm >= Math.max(leaderWpm, 75) && totalErrors === 0) {
        setS2Status('purple');
      } else if (s2Wpm >= (userAvgWpm || 55)) {
        setS2Status('green');
      } else {
        setS2Status('yellow');
      }
    }

    // Sector 3 Complete (100%)
    if (progressPercent >= 100 && !s3Status && s2Time) {
      const elapsedMin = (now - s2Time) / 60000;
      const s3Chars = Math.round(passageLength * 0.34);
      const s3Wpm = Math.round((s3Chars / 5) / Math.max(0.01, elapsedMin));

      if (s3Wpm >= Math.max(leaderWpm, 75) && totalErrors === 0) {
        setS3Status('purple');
      } else if (s3Wpm >= (userAvgWpm || 55)) {
        setS3Status('green');
      } else {
        setS3Status('yellow');
      }
    }
  }, [progressPercent, startTime, s1Time, s2Time, s1Status, s2Status, s3Status, passageLength, leaderWpm, userAvgWpm, totalErrors]);

  // STRICT OPTION 1 TYPERACER INPUT HANDLER:
  const handleKeyDown = (e) => {
    if (disabled) return;

    // Handle Backspace
    if (e.key === 'Backspace') {
      soundEngine.playKeyClick();
      if (currentError) {
        setCurrentError('');
      } else if (typedText.length > 0) {
        const nextTyped = typedText.slice(0, -1);
        const acc = calculateAccuracy(totalKeystrokes, totalErrors);
        onInputChange(nextTyped, acc);
      }
      return;
    }

    // Ignore modifier and non-printable keys
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    e.preventDefault();
    const newTotalKeystrokes = totalKeystrokes + 1;
    setTotalKeystrokes(newTotalKeystrokes);

    const nextIndex = typedText.length;
    const expectedChar = passageText[nextIndex];

    // If an uncorrected typo is already present, lock cursor and record error
    if (currentError) {
      soundEngine.playErrorBeep();
      const newTotalErrors = totalErrors + 1;
      setTotalErrors(newTotalErrors);
      const acc = calculateAccuracy(newTotalKeystrokes, newTotalErrors);
      onInputChange(typedText, acc);
      return;
    }

    // Validate keystroke against expected character
    if (e.key === expectedChar) {
      soundEngine.playKeyClick();
      const nextTyped = typedText + e.key;
      const acc = calculateAccuracy(newTotalKeystrokes, totalErrors);
      onInputChange(nextTyped, acc);
    } else {
      // Typo committed: play alert sound, lock cursor with red indicator
      soundEngine.playErrorBeep();
      const newTotalErrors = totalErrors + 1;
      setTotalErrors(newTotalErrors);
      setCurrentError(e.key);
      const acc = calculateAccuracy(newTotalKeystrokes, newTotalErrors);
      onInputChange(typedText, acc);
    }
  };

  const calculateAccuracy = (keystrokes, errors) => {
    if (keystrokes <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((keystrokes - errors) / keystrokes) * 100)));
  };

  // Split into structured words for clean wrapping
  const words = useMemo(() => {
    let globalIndex = 0;
    return passageText.split(' ').map((word) => {
      const wordObj = {
        word,
        startIndex: globalIndex,
        endIndex: globalIndex + word.length
      };
      globalIndex += word.length + 1; // +1 for space
      return wordObj;
    });
  }, [passageText]);

  // Helper for sector styling
  const getSectorStyle = (sectorNum, status, progressThreshold) => {
    if (status === 'purple') {
      return 'border border-[#b138dd] bg-[#b138dd]/20 text-[#d870ff] font-bold shadow-[0_0_10px_rgba(177,56,221,0.3)]';
    }
    if (status === 'green') {
      return 'border border-[#00d2be] bg-[#00d2be]/20 text-[#00d2be] font-bold shadow-[0_0_10px_rgba(0,210,190,0.2)]';
    }
    if (status === 'yellow') {
      return 'border border-[#ffd700] bg-[#ffd700]/20 text-[#ffd700] font-bold';
    }
    if (progressPercent > progressThreshold) {
      return 'border border-[#00d2be] bg-[#00d2be]/10 text-[#00d2be] animate-pulse';
    }
    return 'bg-[#141522] text-zinc-500';
  };

  const getSectorLabel = (status, progressThreshold) => {
    if (status === 'purple') return '🟣 FASTEST';
    if (status === 'green') return '🟢 PERSONAL BEST';
    if (status === 'yellow') return '🟡 SLOWER';
    if (progressPercent > progressThreshold) return 'ACTIVE';
    return 'READY';
  };

  return (
    <div
      onClick={() => inputRef.current && inputRef.current.focus()}
      className={`relative flex w-full cursor-text flex-col gap-3 rounded-xl border bg-[#0c0d14] p-4 shadow-2xl transition-colors ${
        currentError ? 'border-[#e10600] shadow-[0_0_20px_rgba(225,6,0,0.3)]' : 'border-[#252532] hover:border-[#3a3b50]'
      }`}
    >
      {/* 3-Sector Progress Bar with Authentic F1 Purple/Green/Yellow Split Logic */}
      <div className="grid grid-cols-3 gap-2 border-b border-[#252532] pb-2.5">
        {/* Sector 1 */}
        <div className={`flex items-center justify-between rounded px-3 py-1 font-telemetry text-xs transition-colors ${getSectorStyle(1, s1Status, 0)}`}>
          <span>SECTOR 1</span>
          <span>{getSectorLabel(s1Status, 0)}</span>
        </div>

        {/* Sector 2 */}
        <div className={`flex items-center justify-between rounded px-3 py-1 font-telemetry text-xs transition-colors ${getSectorStyle(2, s2Status, 33)}`}>
          <span>SECTOR 2</span>
          <span>{getSectorLabel(s2Status, 33)}</span>
        </div>

        {/* Sector 3 */}
        <div className={`flex items-center justify-between rounded px-3 py-1 font-telemetry text-xs transition-colors ${getSectorStyle(3, s3Status, 66)}`}>
          <span>SECTOR 3</span>
          <span>{getSectorLabel(s3Status, 66)}</span>
        </div>
      </div>

      {/* Zero-Footprint Hidden Input */}
      <input
        ref={inputRef}
        type="text"
        value=""
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="fixed -top-9999px -left-9999px opacity-0 pointer-events-none"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {/* 3-LINE VIEWPORT CONTAINER (Height 136px = Exactly 3 full 44px lines) */}
      <div
        ref={containerRef}
        className="relative h-[136px] w-full overflow-hidden font-code text-xl select-none sm:text-2xl"
        style={{ lineHeight: `${LINE_HEIGHT_PX}px` }}
      >
        <div className="flex flex-wrap gap-x-2.5">
          {words.map((wObj, wIdx) => {
            return (
              <span key={wIdx} className="inline-flex flex-nowrap whitespace-nowrap">
                {wObj.word.split('').map((char, cIdx) => {
                  const globalCharIndex = wObj.startIndex + cIdx;
                  const isTyped = globalCharIndex < typedText.length;
                  const isCurrent = globalCharIndex === typedText.length;
                  const isErrorOnChar = isCurrent && Boolean(currentError);

                  let colorClass = 'text-[#585c72]'; // Untyped readable dim
                  if (isTyped) colorClass = 'text-[#ffffff] font-medium';
                  if (isErrorOnChar) colorClass = 'text-[#ff3b30] bg-[#ff3b30]/30 underline decoration-[#ff3b30] font-bold animate-pulse';

                  return (
                    <span
                      key={cIdx}
                      ref={isCurrent ? activeCharRef : null}
                      className={`relative transition-colors duration-75 ${colorClass}`}
                    >
                      {/* Smooth Neon Caret */}
                      {isCurrent && !disabled && (
                        <motion.span
                          layoutId="f1TypewriterCaret"
                          className={`absolute -left-[2px] top-1 bottom-1 w-[2.5px] rounded-full shadow-[0_0_10px_#00d2be] ${
                            currentError ? 'bg-[#ff3b30] shadow-[#ff3b30]' : 'bg-[#00d2be]'
                          }`}
                          transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                        />
                      )}
                      {isErrorOnChar ? currentError : char}
                    </span>
                  );
                })}

                {/* Trailing space between words */}
                {wIdx < words.length - 1 && (
                  <span
                    className={
                      typedText.length > wObj.endIndex
                        ? 'text-white'
                        : typedText.length === wObj.endIndex && currentError
                        ? 'bg-[#ff3b30]/30 text-[#ff3b30] underline'
                        : 'text-[#414457]'
                    }
                  >
                    &nbsp;
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Source, Universe & Typo Correction Prompt */}
      <div className="flex items-center justify-between border-t border-[#1e1f2b] pt-2 font-telemetry text-xs">
        {currentError ? (
          <span className="animate-pulse font-bold text-[#ff3b30]">
            ⚠️ TYPO DETECTED — PRESS BACKSPACE TO CORRECT
          </span>
        ) : (
          <span className="text-zinc-500">
            SOURCE: <strong className="text-zinc-300">{source || 'FIA Library'}</strong>
          </span>
        )}
        <span className="uppercase text-[#00d2be]">UNIVERSE: {universe || 'Quotes'}</span>
      </div>

    </div>
  );
}
