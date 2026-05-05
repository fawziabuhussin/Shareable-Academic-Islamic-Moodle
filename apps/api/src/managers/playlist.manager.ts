/**
 * Playlist Manager
 * Business logic layer for creating courses from YouTube playlists
 */
import axios from 'axios';
import { playlistRepository } from '../repositories/playlist.repository';
import { prisma } from '../utils/prisma';
import { AuthContext } from '../types/common.types';
import {
  CreateCourseFromPlaylistDTO,
  CreateModuleFromPlaylistDTO,
  ImportLessonsFromPlaylistDTO,
  ImportLessonsFromPlaylistResponse,
  PlaylistVideo,
  CourseFromPlaylistResponse,
  ModuleFromPlaylistResponse,
} from '../types/playlist.types';
import { authorizationService } from '../services/authorization.service';

/**
 * Result types for manager operations
 */
export interface CreateCourseResult {
  success: boolean;
  data?: CourseFromPlaylistResponse;
  error?: { status: number; message: string };
}

export interface CreateModuleResult {
  success: boolean;
  data?: ModuleFromPlaylistResponse;
  error?: { status: number; message: string };
}

export interface ImportLessonsResult {
  success: boolean;
  data?: ImportLessonsFromPlaylistResponse;
  error?: { status: number; message: string };
}

export class PlaylistManager {
  /**
   * Extract playlist ID from various YouTube URL formats
   */
  private extractPlaylistId(playlistUrl: string): string | null {
    const patterns = [
      /[?&]list=([^#&?]*)/, // Standard: ?list=... or &list=...
      /\/playlist\?list=([^#&?]*)/, // /playlist?list=...
      /list=([^#&?]*)/, // Just list=...
    ];

    for (const pattern of patterns) {
      const match = playlistUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Fetch videos from YouTube playlist using multiple methods
   */
  private async fetchPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
    const videos: PlaylistVideo[] = [];

    // Method 1: Try YouTube RSS Feed first (most reliable)
    try {
      console.log(`Trying RSS feed for playlist: ${playlistId}`);
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      const rssResponse = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
        timeout: 15000,
      });

      const rssXml = rssResponse.data;

      // Extract entries from RSS feed
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const entries: string[] = [];
      let entryMatch;

      while ((entryMatch = entryRegex.exec(rssXml)) !== null) {
        entries.push(entryMatch[1]);
      }

      // Extract video ID and title from each entry
      entries.forEach((entry) => {
        // Extract video ID
        const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        if (!videoIdMatch || !videoIdMatch[1]) return;

        const videoId = videoIdMatch[1].trim();
        if (videoId.length !== 11) return;

        // Extract title - try multiple formats
        let title = '';

        // Try CDATA format: <title><![CDATA[Title]]></title>
        const cdataMatch = entry.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
        if (cdataMatch && cdataMatch[1]) {
          title = cdataMatch[1].trim();
        } else {
          // Try regular format: <title>Title</title>
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
        }

        // Filter out playlist/channel titles
        if (
          title &&
          !title.toLowerCase().includes('youtube') &&
          !title.toLowerCase().includes('playlist') &&
          !title.toLowerCase().includes('channel')
        ) {
          videos.push({
            videoId,
            title: title || `درس ${videos.length + 1}`,
          });
        } else if (videoId) {
          // Add video even without title
          videos.push({
            videoId,
            title: `درس ${videos.length + 1}`,
          });
        }
      });

      if (videos.length > 0) {
        console.log(`Successfully extracted ${videos.length} videos from RSS feed`);
        return videos;
      }
    } catch (rssError: any) {
      console.error('RSS feed method failed:', rssError.message);
    }

    // Method 2: Try scraping the playlist page HTML
    try {
      console.log(`Trying HTML scraping for playlist: ${playlistId}`);
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      const response = await axios.get(playlistUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 15000,
      });

      const html = response.data;

      // Try multiple patterns for ytInitialData
      const ytInitialDataPatterns = [
        /var ytInitialData = ({.+?});/s,
        /window\["ytInitialData"\] = ({.+?});/s,
        /ytInitialData\s*=\s*({.+?});/s,
      ];

      for (const pattern of ytInitialDataPatterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            const data = JSON.parse(match[1]);

            // Navigate through the nested structure to find playlist videos
            const findVideos = (obj: any, depth = 0): void => {
              if (depth > 15) return; // Prevent infinite recursion

              if (Array.isArray(obj)) {
                obj.forEach((item) => findVideos(item, depth + 1));
              } else if (obj && typeof obj === 'object') {
                // Check if this is a playlist video renderer
                if (obj.playlistVideoRenderer) {
                  const video = obj.playlistVideoRenderer;
                  const videoId = video?.videoId;
                  const title =
                    video?.title?.runs?.[0]?.text ||
                    video?.title?.simpleText ||
                    video?.title?.accessibility?.accessibilityData?.label ||
                    `فيديو ${videos.length + 1}`;
                  if (videoId && !videos.find((v) => v.videoId === videoId)) {
                    videos.push({ videoId, title });
                  }
                }

                // Also check for videoRenderer (alternative structure)
                if (obj.videoRenderer) {
                  const video = obj.videoRenderer;
                  const videoId = video?.videoId;
                  const title =
                    video?.title?.runs?.[0]?.text || video?.title?.simpleText || `فيديو ${videos.length + 1}`;
                  if (videoId && !videos.find((v) => v.videoId === videoId)) {
                    videos.push({ videoId, title });
                  }
                }

                // Check for playlistPanelVideoRenderer
                if (obj.playlistPanelVideoRenderer) {
                  const video = obj.playlistPanelVideoRenderer;
                  const videoId = video?.videoId;
                  const title =
                    video?.title?.runs?.[0]?.text || video?.title?.simpleText || `فيديو ${videos.length + 1}`;
                  if (videoId && !videos.find((v) => v.videoId === videoId)) {
                    videos.push({ videoId, title });
                  }
                }

                // Recursively search in all object properties
                Object.values(obj).forEach((value) => findVideos(value, depth + 1));
              }
            };

            findVideos(data);

            if (videos.length > 0) break; // Found videos, stop trying other patterns
          } catch (e) {
            console.error('Failed to parse YouTube data:', e);
            continue; // Try next pattern
          }
        }
      }

      // Remove duplicates
      const uniqueVideos = videos.filter((video, index, self) => index === self.findIndex((v) => v.videoId === video.videoId));

      console.log(`Found ${uniqueVideos.length} videos in playlist ${playlistId}`);
      return uniqueVideos;
    } catch (htmlError: any) {
      console.error('HTML scraping method failed:', htmlError.message);
    }

    // If all methods failed, return empty array
    console.error(`All methods failed to extract videos from playlist ${playlistId}`);
    return [];
  }

  /**
   * Create course from YouTube playlist
   */
  async createCourseFromPlaylist(auth: AuthContext, data: CreateCourseFromPlaylistDTO): Promise<CreateCourseResult> {
    // Authorization check - only teachers and admins
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بإنشاء الدورات' },
      };
    }

    // Extract playlist ID
    const playlistId = this.extractPlaylistId(data.playlistUrl);
    if (!playlistId) {
      return {
        success: false,
        error: { status: 400, message: 'Invalid playlist URL. Please provide a valid YouTube playlist URL.' },
      };
    }

    // Determine teacher ID (admins can specify, teachers use their own ID)
    const teacherId = auth.role === 'ADMIN' && data.teacherId ? data.teacherId : auth.userId;

    // Create course
    const course = await playlistRepository.createCourse({
      title: data.courseTitle,
      description: data.courseDescription || `دورة من قائمة تشغيل YouTube`,
      categoryId: data.categoryId,
      teacherId,
      coverImage: data.coverImage,
      price: data.price || 0,
      status: data.status || 'DRAFT',
    });

    // Create module
    const module = await playlistRepository.createModule(course.id, 'المحاضرات', 1);

    // Fetch playlist videos
    console.log(`Fetching videos for playlist: ${playlistId}`);
    const videos = await this.fetchPlaylistVideos(playlistId);
    console.log(`Found ${videos.length} videos in playlist`);

    if (videos.length > 0) {
      // Create a lesson for each video
      console.log(`Creating ${videos.length} lessons...`);
      const lessons = await playlistRepository.createLessons(
        videos.map((video, index) => ({
          moduleId: module.id,
          title: video.title || `درس ${index + 1}`,
          type: 'VIDEO',
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          order: index + 1,
        }))
      );

      console.log(`Successfully created ${lessons.length} lessons`);

      return {
        success: true,
        data: {
          course,
          module,
          lessons,
          videosCount: videos.length,
          message: `تم إنشاء الدورة بنجاح مع ${lessons.length} درس من قائمة التشغيل`,
        },
      };
    } else {
      console.log('No videos found, creating fallback playlist lesson');
      // Fallback: create a single lesson with the playlist
      const lesson = await playlistRepository.createLesson({
        moduleId: module.id,
        title: data.courseTitle,
        type: 'PLAYLIST',
        order: 1,
        youtubeUrl: data.playlistUrl,
        youtubePlaylistId: playlistId,
      });

      return {
        success: true,
        data: {
          course,
          module,
          lesson,
          videosCount: 0,
          message:
            'تم إنشاء الدورة من قائمة التشغيل. لم يتم استخراج الفيديوهات الفردية. سيتم استخدام قائمة التشغيل المدمجة.',
        },
      };
    }
  }

  /**
   * Create a module from a YouTube playlist within an existing course
   */
  async createModuleFromPlaylist(auth: AuthContext, data: CreateModuleFromPlaylistDTO): Promise<CreateModuleResult> {
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بإنشاء الوحدات' },
      };
    }

    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: data.courseId });
    if (!access.allowed) {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح بالإضافة إلى هذه الدورة' },
      };
    }

    const playlistId = this.extractPlaylistId(data.playlistUrl);
    if (!playlistId) {
      return {
        success: false,
        error: { status: 400, message: 'رابط قائمة التشغيل غير صحيح. يرجى إدخال رابط قائمة تشغيل YouTube صحيح.' },
      };
    }

    const module = await playlistRepository.createModuleAutoOrder(data.courseId, data.moduleTitle);

    console.log(`Fetching videos for playlist: ${playlistId}`);
    const videos = await this.fetchPlaylistVideos(playlistId);
    console.log(`Found ${videos.length} videos in playlist`);

    if (videos.length > 0) {
      console.log(`Creating ${videos.length} lessons...`);
      const lessons = await playlistRepository.createLessons(
        videos.map((video, index) => ({
          moduleId: module.id,
          title: video.title || `درس ${index + 1}`,
          type: 'VIDEO',
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          order: index + 1,
        }))
      );

      console.log(`Successfully created ${lessons.length} lessons in module`);

      return {
        success: true,
        data: {
          module,
          lessons,
          videosCount: videos.length,
          message: `تم إنشاء الوحدة بنجاح مع ${lessons.length} درس من قائمة التشغيل`,
        },
      };
    }

    console.log('No videos found, creating fallback playlist lesson');
    const lesson = await playlistRepository.createLesson({
      moduleId: module.id,
      title: data.moduleTitle,
      type: 'PLAYLIST',
      order: 1,
      youtubeUrl: data.playlistUrl,
      youtubePlaylistId: playlistId,
    });

    return {
      success: true,
      data: {
        module,
        lesson,
        videosCount: 0,
        message: 'تم إنشاء الوحدة من قائمة التشغيل. لم يتم استخراج الفيديوهات الفردية.',
      },
    };
  }

  /**
   * Add lessons to an existing module from a YouTube playlist (same extraction as create-course).
   */
  async importLessonsFromPlaylist(auth: AuthContext, data: ImportLessonsFromPlaylistDTO): Promise<ImportLessonsResult> {
    if (auth.role !== 'TEACHER' && auth.role !== 'ADMIN') {
      return {
        success: false,
        error: { status: 403, message: 'غير مسموح' },
      };
    }

    const mod = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: {
        course: { select: { id: true, teacherId: true, title: true } },
      },
    });

    if (!mod) {
      return { success: false, error: { status: 404, message: 'الوحدة غير موجودة' } };
    }

    const access = await authorizationService.checkWriteAccess(auth, { type: 'course', id: mod.courseId });
    if (!access.allowed) {
      return { success: false, error: { status: 403, message: 'لا يمكنك تعديل هذه الدورة' } };
    }

    const playlistId = this.extractPlaylistId(data.playlistUrl);
    if (!playlistId) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'رابط قائمة التشغيل غير صالح. استخدم رابط قائمة YouTube يحتوي list=',
        },
      };
    }

    const videos = await this.fetchPlaylistVideos(playlistId);
    const maxAgg = await prisma.lesson.aggregate({
      where: { moduleId: data.moduleId },
      _max: { order: true },
    });
    const nextOrder = (maxAgg._max.order ?? 0) + 1;

    if (videos.length > 0) {
      const lessons = await playlistRepository.createLessons(
        videos.map((video, index) => ({
          moduleId: data.moduleId,
          title: video.title || `درس ${nextOrder + index}`,
          type: 'VIDEO',
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          order: nextOrder + index,
        }))
      );

      return {
        success: true,
        data: {
          lessons,
          videosCount: lessons.length,
          message: `تمت إضافة ${lessons.length} درساً من قائمة التشغيل`,
        },
      };
    }

    const lesson = await playlistRepository.createLesson({
      moduleId: data.moduleId,
      title: `قائمة تشغيل — ${mod.course.title}`,
      type: 'PLAYLIST',
      order: nextOrder,
      youtubeUrl: data.playlistUrl.trim(),
      youtubePlaylistId: playlistId,
    });

    return {
      success: true,
      data: {
        lessons: [lesson],
        videosCount: 0,
        message: 'لم يُستخرج فيديو منفصل من القائمة؛ أُضيف درس واحد من نوع قائمة تشغيل مدمجة.',
      },
    };
  }
}

/**
 * Singleton instance
 */
export const playlistManager = new PlaylistManager();
