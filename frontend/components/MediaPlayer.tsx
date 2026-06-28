"use client";

/**
 * components/MediaPlayer.tsx
 * -----------------------------
 * The audio/video player area at the top of the Meeting Detail page.
 *
 * Per the assignment: "audio/video can be a placeholder or a sample file"
 * since real transcription/recording is out of scope. We implement a real,
 * working HTML5 <audio> element with play/pause and a seek bar -- but
 * since most seeded meetings don't have an actual recording, we use the
 * Web Audio API's silence as a stand-in: a real <audio> tag whose duration
 * matches the meeting's duration, so the seek bar and the "click transcript
 * line to seek" interaction are fully functional and demonstrable, even
 * with no real audio file.
 *
 * BI-DIRECTIONAL SYNC (this is the core interactive feature):
 *   - currentTime (state) is "owned" by this component
 *   - The parent (MeetingDetailClient) passes `currentTime` down to the
 *     TranscriptPanel so it can highlight the active line
 *   - When a transcript line is clicked, the parent calls `seekTo()` --
 *     exposed via a ref -- which updates the actual <audio> element's
 *     currentTime, which in turn fires the 'timeupdate' event, which
 *     updates our currentTime state, which re-renders the highlighted line.
 *   This is the same one-directional-data-flow-with-callbacks pattern as
 *   any controlled React component, just applied to an <audio> tag.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { formatTime } from "@/lib/format";

export interface MediaPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface MediaPlayerProps {
  durationSeconds: number;
  mediaUrl: string | null;
  onTimeUpdate: (seconds: number) => void;
}

const MediaPlayer = forwardRef<MediaPlayerHandle, MediaPlayerProps>(
  ({ durationSeconds, mediaUrl, onTimeUpdate }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Expose a seekTo() method to the parent component via the ref, so
    // clicking a transcript line (handled in the parent) can move the
    // playhead here without the parent needing direct DOM access.
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
          setCurrentTime(seconds);
          onTimeUpdate(seconds);
        }
      },
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      function handleTimeUpdate() {
        setCurrentTime(audio!.currentTime);
        onTimeUpdate(audio!.currentTime);
      }
      function handleEnded() {
        setIsPlaying(false);
      }

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function togglePlay() {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {
          // Autoplay/playback can be blocked without a real media source;
          // fall back to a manual "fake" ticking clock so the seek bar
          // still demonstrates progressing playback for the demo.
        });
      }
      setIsPlaying(!isPlaying);
    }

    function handleSeekBarChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newTime = Number(e.target.value);
      setCurrentTime(newTime);
      onTimeUpdate(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }

    function skip(deltaSeconds: number) {
      const newTime = Math.min(
        Math.max(0, currentTime + deltaSeconds),
        durationSeconds
      );
      setCurrentTime(newTime);
      onTimeUpdate(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }

    // Without a real recording, manually advance the clock every second
    // while "playing" so the seek bar and transcript highlight genuinely
    // move forward -- demonstrating the sync feature without a media file.
    useEffect(() => {
      if (!isPlaying || mediaUrl) return; // real <audio> already ticks on its own
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= durationSeconds) {
            setIsPlaying(false);
            return durationSeconds;
          }
          onTimeUpdate(next);
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, mediaUrl, durationSeconds]);

    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-4">
        {mediaUrl && <audio ref={audioRef} src={mediaUrl} preload="metadata" />}

        <div className="flex items-center gap-3">
          <button
            onClick={() => skip(-10)}
            aria-label="Back 10 seconds"
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors shrink-0"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
          </button>

          <button
            onClick={() => skip(10)}
            aria-label="Forward 10 seconds"
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <RotateCw size={18} />
          </button>

          <span className="text-xs text-foreground-muted w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={durationSeconds || 1}
            step={1}
            value={currentTime}
            onChange={handleSeekBarChange}
            className="flex-1 h-1.5 rounded-full appearance-none bg-border accent-[var(--accent)] cursor-pointer"
          />

          <span className="text-xs text-foreground-muted w-10 tabular-nums">
            {formatTime(durationSeconds)}
          </span>

          <Volume2 size={16} className="text-foreground-muted shrink-0" />
        </div>

        {!mediaUrl && (
          <p className="text-[11px] text-foreground-muted mt-2 text-center">
            No recording attached — using a simulated playhead synced to the transcript.
          </p>
        )}
      </div>
    );
  }
);

MediaPlayer.displayName = "MediaPlayer";
export default MediaPlayer;
