"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { sosApi } from "@/lib/api";
import { toast } from "sonner";

const TRIGGER_WORD = "pineapple";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoiceSOS() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) return;

    setSupported(true);
    const rec = new SpeechRecognitionApi();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;

    rec.onresult = async (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript
            .toLowerCase()
            .trim();
          if (transcript.includes(TRIGGER_WORD)) {
            // Trigger SOS silently — no visual indication to prevent attacker awareness
            try {
              await sosApi.trigger({
                type: "voice",
                message: "Voice SOS triggered (keyword detected)",
              });
            } catch {
              // Silent fail to avoid attacker awareness
            }
            break;
          }
        }
      }
    };

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      // Auto-restart after short delay to keep listening
      restartRef.current = setTimeout(() => {
        try {
          rec.start();
        } catch {
          // Already started or not available
        }
      }, 1500);
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Voice SOS disabled.");
        setSupported(false);
      }
    };

    recognitionRef.current = rec;

    // Start listening
    try {
      rec.start();
    } catch {
      // May fail if already running
    }

    return () => {
      if (restartRef.current) clearTimeout(restartRef.current);
      try {
        rec.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <div
      title={listening ? "Voice SOS listening" : "Voice SOS inactive"}
      className="flex items-center gap-1 text-[10px] text-ts-slate/40 select-none"
    >
      {listening ? (
        <Mic className="w-3 h-3 text-ts-teal/60 animate-pulse" />
      ) : (
        <MicOff className="w-3 h-3 text-ts-slate/30" />
      )}
    </div>
  );
}
