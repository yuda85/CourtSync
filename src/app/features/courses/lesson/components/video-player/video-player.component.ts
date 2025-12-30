import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VideoPlayerService, PLAYBACK_SPEEDS, PlaybackSpeed } from '@core/services/video-player.service';
import { VideoProgress } from '@core/models/progress.interface';

/**
 * Enhanced Video Player Component
 * Supports YouTube and HTML5 video with custom controls
 * Features: speed control, bookmarks, PiP, keyboard shortcuts
 */
@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss'
})
export class VideoPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  readonly playerService = inject(VideoPlayerService);

  @ViewChild('videoElement') videoElementRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') playerContainerRef!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly videoUrl = input.required<string>();
  readonly savedProgress = input<VideoProgress | null>(null);
  readonly courseId = input<string>('');
  readonly lessonId = input<string>('');

  // Outputs
  readonly progressUpdate = output<{ position: number; speed: number }>();
  readonly timeUpdate = output<number>();
  readonly bookmarkRequest = output<number>();

  // Local state
  readonly isYouTube = computed(() => {
    const url = this.videoUrl();
    return url.includes('youtube.com') || url.includes('youtu.be');
  });

  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.videoUrl();
    if (!this.isYouTube()) return null;

    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );

    if (match) {
      const embedUrl = `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&rel=0&modestbranding=1`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
    return null;
  });

  readonly showControls = signal(true);
  readonly showSpeedMenu = signal(false);
  readonly isHovering = signal(false);

  readonly playbackSpeeds = PLAYBACK_SPEEDS;

  private controlsTimeout: number | null = null;
  private youtubePlayer: any = null;

  ngOnInit(): void {
    this.playerService.setContext(this.courseId(), this.lessonId());
  }

  ngAfterViewInit(): void {
    if (!this.isYouTube() && this.videoElementRef) {
      this.initializeHtml5Video();
    } else if (this.isYouTube()) {
      this.loadYouTubeAPI();
    }
  }

  ngOnDestroy(): void {
    this.playerService.stopAutoSave();
    this.playerService.saveProgress();
    this.playerService.unregisterVideoElement();

    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }

  // Initialize HTML5 video
  private initializeHtml5Video(): void {
    const video = this.videoElementRef.nativeElement;
    this.playerService.registerVideoElement(video);

    // Initialize from saved progress
    const saved = this.savedProgress();
    if (saved) {
      this.playerService.initializeFromProgress(saved);
      if (saved.playbackPosition > 0) {
        video.currentTime = saved.playbackPosition;
      }
    }

    // Start auto-save
    this.playerService.startAutoSave();

    // Emit time updates
    video.addEventListener('timeupdate', () => {
      this.timeUpdate.emit(this.playerService.currentTime());
    });
  }

  // Load YouTube IFrame API
  private loadYouTubeAPI(): void {
    // YouTube IFrame API would be loaded here
    // For now, we show the standard iframe
    // Full YouTube API integration would require additional setup
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.playerService.handleKeyboardShortcut(event)) {
      this.showControlsTemporarily();
    }
  }

  // Mouse movement for controls visibility
  onMouseMove(): void {
    this.showControlsTemporarily();
  }

  onMouseEnter(): void {
    this.isHovering.set(true);
    this.showControls.set(true);
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
    if (!this.showSpeedMenu()) {
      this.hideControlsDelayed();
    }
  }

  private showControlsTemporarily(): void {
    this.showControls.set(true);
    this.hideControlsDelayed();
  }

  private hideControlsDelayed(): void {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }

    if (this.playerService.isPlaying() && !this.isHovering()) {
      this.controlsTimeout = window.setTimeout(() => {
        if (!this.showSpeedMenu()) {
          this.showControls.set(false);
        }
      }, 3000);
    }
  }

  // Play/Pause toggle
  togglePlay(): void {
    this.playerService.togglePlayPause();
  }

  // Seek bar click
  onSeekBarClick(event: MouseEvent): void {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    // RTL: calculate from right side
    const clickX = rect.right - event.clientX;
    const percent = clickX / rect.width;
    const time = this.playerService.duration() * percent;
    this.playerService.seekTo(time);
  }

  // Speed menu toggle
  toggleSpeedMenu(): void {
    this.showSpeedMenu.update(v => !v);
  }

  // Set playback speed
  setSpeed(speed: PlaybackSpeed): void {
    this.playerService.setPlaybackSpeed(speed);
    this.showSpeedMenu.set(false);
  }

  // Picture-in-Picture
  togglePiP(): void {
    this.playerService.togglePictureInPicture();
  }

  // Fullscreen
  toggleFullscreen(): void {
    this.playerService.toggleFullscreen();
  }

  // Add bookmark at current time
  addBookmark(): void {
    this.bookmarkRequest.emit(this.playerService.currentTime());
  }

  // Mute toggle
  toggleMute(): void {
    this.playerService.toggleMute();
  }

  // Format time display
  formatTime(seconds: number): string {
    return this.playerService.formatTime(seconds);
  }

  // Close speed menu on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showSpeedMenu()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.speed-control')) {
        this.showSpeedMenu.set(false);
      }
    }
  }
}
