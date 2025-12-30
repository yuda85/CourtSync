import { Injectable, inject, signal, computed } from '@angular/core';
import { ProgressRepo } from '@core/repos/progress.repo';
import { VideoProgress } from '@core/models/progress.interface';

/**
 * Available playback speeds
 */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

/**
 * Keyboard shortcut mapping
 */
export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: ' ',           // Space
  SEEK_FORWARD: 'ArrowRight',
  SEEK_BACKWARD: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  MUTE: 'm',
  FULLSCREEN: 'f',
  PICTURE_IN_PICTURE: 'p',
  SPEED_UP: '>',
  SPEED_DOWN: '<'
} as const;

/**
 * Video Player Service
 * Manages video playback state, keyboard shortcuts, and progress persistence
 */
@Injectable({
  providedIn: 'root'
})
export class VideoPlayerService {
  private readonly progressRepo = inject(ProgressRepo);

  /** Current playback speed */
  readonly playbackSpeed = signal<PlaybackSpeed>(1);

  /** Current playback position in seconds */
  readonly currentTime = signal(0);

  /** Total video duration in seconds */
  readonly duration = signal(0);

  /** Whether video is currently playing */
  readonly isPlaying = signal(false);

  /** Whether video is muted */
  readonly isMuted = signal(false);

  /** Current volume (0-1) */
  readonly volume = signal(1);

  /** Whether picture-in-picture is active */
  readonly isPictureInPicture = signal(false);

  /** Whether fullscreen is active */
  readonly isFullscreen = signal(false);

  /** Progress percentage computed */
  readonly progressPercent = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return Math.round((this.currentTime() / dur) * 100);
  });

  /** Formatted current time */
  readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));

  /** Formatted duration */
  readonly formattedDuration = computed(() => this.formatTime(this.duration()));

  /** Reference to the video element */
  private videoElement: HTMLVideoElement | null = null;

  /** Auto-save interval ID */
  private autoSaveInterval: number | null = null;

  /** Current course and lesson IDs for saving progress */
  private currentCourseId = '';
  private currentLessonId = '';

  /**
   * Register a video element to control
   */
  registerVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element;
    this.setupVideoListeners();
  }

  /**
   * Unregister video element and clean up
   */
  unregisterVideoElement(): void {
    this.stopAutoSave();
    this.videoElement = null;
    this.resetState();
  }

  /**
   * Set the current context for progress saving
   */
  setContext(courseId: string, lessonId: string): void {
    this.currentCourseId = courseId;
    this.currentLessonId = lessonId;
  }

  /**
   * Initialize from saved progress
   */
  async initializeFromProgress(progress: VideoProgress | null): Promise<void> {
    if (progress) {
      this.playbackSpeed.set(progress.playbackSpeed as PlaybackSpeed || 1);
      // Position will be set when video loads
      if (this.videoElement && progress.playbackPosition > 0) {
        this.videoElement.currentTime = progress.playbackPosition;
      }
    }
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed.set(speed);
    if (this.videoElement) {
      this.videoElement.playbackRate = speed;
    }
  }

  /**
   * Cycle through playback speeds
   */
  cyclePlaybackSpeed(direction: 'up' | 'down' = 'up'): void {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(this.playbackSpeed());
    let newIndex: number;

    if (direction === 'up') {
      newIndex = Math.min(currentIndex + 1, PLAYBACK_SPEEDS.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    this.setPlaybackSpeed(PLAYBACK_SPEEDS[newIndex]);
  }

  /**
   * Play video
   */
  play(): void {
    this.videoElement?.play();
  }

  /**
   * Pause video
   */
  pause(): void {
    this.videoElement?.pause();
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek to a specific time
   */
  seekTo(seconds: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = Math.max(0, Math.min(seconds, this.duration()));
    }
  }

  /**
   * Seek forward by seconds
   */
  seekForward(seconds = 10): void {
    this.seekTo(this.currentTime() + seconds);
  }

  /**
   * Seek backward by seconds
   */
  seekBackward(seconds = 10): void {
    this.seekTo(this.currentTime() - seconds);
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    if (this.videoElement) {
      this.videoElement.muted = !this.videoElement.muted;
      this.isMuted.set(this.videoElement.muted);
    }
  }

  /**
   * Set volume
   */
  setVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.volume.set(clamped);
    if (this.videoElement) {
      this.videoElement.volume = clamped;
    }
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen(): Promise<void> {
    if (!this.videoElement) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.isFullscreen.set(false);
      } else {
        await this.videoElement.requestFullscreen();
        this.isFullscreen.set(true);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }

  /**
   * Toggle picture-in-picture mode
   */
  async togglePictureInPicture(): Promise<void> {
    if (!this.videoElement) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPictureInPicture.set(false);
      } else if (document.pictureInPictureEnabled) {
        await this.videoElement.requestPictureInPicture();
        this.isPictureInPicture.set(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcut(event: KeyboardEvent): boolean {
    // Don't handle if typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return false;
    }

    switch (event.key) {
      case KEYBOARD_SHORTCUTS.PLAY_PAUSE:
        event.preventDefault();
        this.togglePlayPause();
        return true;

      case KEYBOARD_SHORTCUTS.SEEK_FORWARD:
        event.preventDefault();
        this.seekForward(event.shiftKey ? 30 : 10);
        return true;

      case KEYBOARD_SHORTCUTS.SEEK_BACKWARD:
        event.preventDefault();
        this.seekBackward(event.shiftKey ? 30 : 10);
        return true;

      case KEYBOARD_SHORTCUTS.VOLUME_UP:
        event.preventDefault();
        this.setVolume(this.volume() + 0.1);
        return true;

      case KEYBOARD_SHORTCUTS.VOLUME_DOWN:
        event.preventDefault();
        this.setVolume(this.volume() - 0.1);
        return true;

      case KEYBOARD_SHORTCUTS.MUTE:
        event.preventDefault();
        this.toggleMute();
        return true;

      case KEYBOARD_SHORTCUTS.FULLSCREEN:
        event.preventDefault();
        this.toggleFullscreen();
        return true;

      case KEYBOARD_SHORTCUTS.PICTURE_IN_PICTURE:
        event.preventDefault();
        this.togglePictureInPicture();
        return true;

      case KEYBOARD_SHORTCUTS.SPEED_UP:
        event.preventDefault();
        this.cyclePlaybackSpeed('up');
        return true;

      case KEYBOARD_SHORTCUTS.SPEED_DOWN:
        event.preventDefault();
        this.cyclePlaybackSpeed('down');
        return true;

      default:
        return false;
    }
  }

  /**
   * Start auto-saving progress every 10 seconds
   */
  startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveInterval = window.setInterval(() => {
      this.saveProgress();
    }, 10000);
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Save current progress to Firestore
   */
  async saveProgress(): Promise<void> {
    if (!this.currentCourseId || !this.currentLessonId) return;

    try {
      await this.progressRepo.saveVideoProgress(
        this.currentCourseId,
        this.currentLessonId,
        {
          playbackPosition: this.currentTime(),
          playbackSpeed: this.playbackSpeed()
        }
      );
    } catch (err) {
      console.error('Error saving video progress:', err);
    }
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS
   */
  formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Setup video element event listeners
   */
  private setupVideoListeners(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('play', () => this.isPlaying.set(true));
    this.videoElement.addEventListener('pause', () => this.isPlaying.set(false));
    this.videoElement.addEventListener('ended', () => this.isPlaying.set(false));
    this.videoElement.addEventListener('timeupdate', () => {
      this.currentTime.set(this.videoElement!.currentTime);
    });
    this.videoElement.addEventListener('durationchange', () => {
      this.duration.set(this.videoElement!.duration);
    });
    this.videoElement.addEventListener('volumechange', () => {
      this.volume.set(this.videoElement!.volume);
      this.isMuted.set(this.videoElement!.muted);
    });
    this.videoElement.addEventListener('enterpictureinpicture', () => {
      this.isPictureInPicture.set(true);
    });
    this.videoElement.addEventListener('leavepictureinpicture', () => {
      this.isPictureInPicture.set(false);
    });

    // Apply current speed
    this.videoElement.playbackRate = this.playbackSpeed();
  }

  /**
   * Reset state
   */
  private resetState(): void {
    this.currentTime.set(0);
    this.duration.set(0);
    this.isPlaying.set(false);
    this.isPictureInPicture.set(false);
    this.isFullscreen.set(false);
  }
}
