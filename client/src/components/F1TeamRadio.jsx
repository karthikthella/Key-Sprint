import React, { useState, useRef, useEffect } from 'react';
import { Send, Radio, MessageSquare, Flame, Sparkles } from 'lucide-react';
import { RADIO_PRESETS } from '../theme/f1Constants';

export default function F1TeamRadio({ onSendChat, onSendReaction, chatMessages = [] }) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Automatically scroll to the latest message whenever chatMessages updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendChat(inputText.trim());
    setInputText('');
  };

  const handlePresetClick = (preset) => {
    onSendChat(preset);
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-[#252532] bg-[#0c0d14] p-4 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252532] pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#e10600] px-2 py-0.5 font-f1 text-xs text-white skew-f1">
            <Radio className="h-3 w-3 unskew-f1" />
            <span className="unskew-f1">TEAM RADIO</span>
          </div>
          <span className="font-telemetry text-[10px] text-zinc-400">PIT WALL COMMS</span>
        </div>

        {/* Live Audio Wave Graphic */}
        <div className="flex items-center gap-1">
          <span className="w-1 bg-[#00d2be] animate-wave-1 rounded-full"></span>
          <span className="w-1 bg-[#00d2be] animate-wave-2 rounded-full"></span>
          <span className="w-1 bg-[#00d2be] animate-wave-3 rounded-full"></span>
          <span className="w-1 bg-[#00d2be] animate-wave-4 rounded-full"></span>
        </div>
      </div>

      {/* Radio Message History with Auto-Scroll to Bottom */}
      <div className="flex h-36 flex-col gap-2 overflow-y-auto rounded-lg border border-[#1b1c28] bg-[#08080c] p-2.5">
        {chatMessages.length === 0 ? (
          <div className="my-auto text-center font-telemetry text-xs text-zinc-600">
            No radio traffic. Use presets below or type a message.
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded border border-[#20212f] bg-[#12131d] px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1">
                <span className="bg-[#e10600] px-1 font-f1 text-[9px] text-white skew-f1">
                  <span className="unskew-f1">RADIO</span>
                </span>
                <span className="font-f1 text-xs font-bold text-[#00d2be]">
                  {msg.username}:
                </span>
              </div>
              <span className="font-telemetry text-xs text-zinc-200">{msg.message}</span>
            </div>
          ))
        )}
        {/* Anchor element to automatically scroll into view */}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Radio Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {RADIO_PRESETS.slice(0, 4).map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(preset)}
            className="rounded border border-[#252636] bg-[#141520] px-2 py-1 font-telemetry text-[10px] font-bold text-zinc-300 transition-colors hover:border-[#00d2be] hover:text-white"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Chat Input & Live Emote Reactions */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-[#252532] bg-[#12131d] px-3 py-1.5 focus-within:border-[#00d2be]">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Radio pit wall..."
            className="w-full bg-transparent font-telemetry text-xs text-white outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={handleSend}
            className="text-zinc-400 transition-colors hover:text-[#00d2be]"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Reaction Buttons */}
        <div className="flex items-center gap-1">
          {['🔥', '🚀', '⚡', '💀', 'GG'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#252532] bg-[#161723] text-sm transition-transform hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
