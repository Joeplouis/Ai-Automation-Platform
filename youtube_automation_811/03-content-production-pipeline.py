#!/usr/bin/env python3

"""
Phase 1: Content Production Pipeline
Target: Scale to 1,000 videos/day production
Timeline: Weeks 5-6
"""

import asyncio
import aiohttp
import aiofiles
import json
import os
import subprocess
import tempfile
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import mysql.connector
import redis
import numpy as np
from dataclasses import dataclass
import hashlib
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/phase1-content-production.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ContentRequest:
    niche: str
    platform: str
    content_type: str = "video"
    duration: int = 60  # seconds
    style: str = "educational"
    target_audience: str = "general"
    affiliate_products: List[str] = None
    trending_keywords: List[str] = None

@dataclass
class ProductionMetrics:
    videos_produced: int = 0
    processing_time: float = 0.0
    success_rate: float = 0.0
    average_quality_score: float = 0.0
    storage_used: float = 0.0

class OllamaClusterManager:
    """Manages load-balanced Ollama cluster for AI content generation"""
    
    def __init__(self):
        self.endpoints = [
            "http://localhost:11434",
            "http://localhost:11435", 
            "http://localhost:11436",
            "http://localhost:11437"
        ]
        self.load_balancer = "http://localhost:11430"  # HAProxy endpoint
        self.current_endpoint = 0
        self.request_cache = {}
        self.performance_stats = {}
    
    async def generate_content(self, prompt: str, model: str = "llama3.1:8b") -> str:
        """Generate content using load-balanced Ollama cluster"""
        
        # Check cache first
        cache_key = hashlib.md5(f"{prompt}:{model}".encode()).hexdigest()
        if cache_key in self.request_cache:
            logger.debug(f"Cache hit for prompt: {prompt[:50]}...")
            return self.request_cache[cache_key]
        
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 2048,
                        "frequency_penalty": 0.1
                    }
                }
                
                async with session.post(
                    f"{self.load_balancer}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result.get('response', '')
                        
                        # Cache successful responses
                        self.request_cache[cache_key] = content
                        
                        # Update performance stats
                        processing_time = time.time() - start_time
                        self.update_performance_stats(model, processing_time, True)
                        
                        logger.debug(f"Generated content in {processing_time:.2f}s")
                        return content
                    else:
                        logger.error(f"Ollama request failed: {response.status}")
                        return ""
                        
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            self.update_performance_stats(model, time.time() - start_time, False)
            return ""
    
    def update_performance_stats(self, model: str, processing_time: float, success: bool):
        """Update performance statistics"""
        if model not in self.performance_stats:
            self.performance_stats[model] = {
                'total_requests': 0,
                'successful_requests': 0,
                'total_time': 0.0,
                'average_time': 0.0
            }
        
        stats = self.performance_stats[model]
        stats['total_requests'] += 1
        stats['total_time'] += processing_time
        
        if success:
            stats['successful_requests'] += 1
        
        stats['average_time'] = stats['total_time'] / stats['total_requests']
    
    def get_performance_stats(self) -> Dict:
        """Get current performance statistics"""
        return self.performance_stats

class ContentScriptGenerator:
    """Generates video scripts using AI"""
    
    def __init__(self, ollama_manager: OllamaClusterManager):
        self.ollama = ollama_manager
        
        # Script templates for different niches
        self.script_templates = {
            'ai_technology': {
                'hook_templates': [
                    "Did you know AI can now {capability}?",
                    "This AI breakthrough will change everything...",
                    "I tested {ai_tool} for 30 days, here's what happened...",
                    "The future of {industry} just arrived..."
                ],
                'structure': 'problem_solution_proof_action',
                'tone': 'educational_exciting'
            },
            'business_marketing': {
                'hook_templates': [
                    "This marketing strategy generated ${amount} in 30 days...",
                    "I discovered the secret to {business_goal}...",
                    "Stop doing {common_mistake} - do this instead...",
                    "How to {achievement} in {timeframe}..."
                ],
                'structure': 'story_lesson_application_cta',
                'tone': 'authoritative_helpful'
            },
            'finance_investing': {
                'hook_templates': [
                    "This investment strategy beats the market by {percentage}%...",
                    "I made ${amount} using this simple technique...",
                    "The wealthy don't want you to know this...",
                    "This financial mistake costs you ${amount} per year..."
                ],
                'structure': 'revelation_explanation_proof_action',
                'tone': 'confident_educational'
            },
            'health_fitness': {
                'hook_templates': [
                    "I lost {amount} pounds in {timeframe} doing this...",
                    "This exercise burns 3x more calories...",
                    "Doctors hate this simple health trick...",
                    "The supplement industry doesn't want you to know..."
                ],
                'structure': 'transformation_method_science_action',
                'tone': 'motivational_scientific'
            },
            'lifestyle_travel': {
                'hook_templates': [
                    "I traveled to {destination} for only ${amount}...",
                    "This life hack changed everything...",
                    "The secret to {lifestyle_goal} is...",
                    "I quit my job to {lifestyle_change}..."
                ],
                'structure': 'story_inspiration_tips_encouragement',
                'tone': 'inspiring_relatable'
            }
        }
    
    async def generate_script(self, request: ContentRequest) -> Dict:
        """Generate a video script based on content request"""
        logger.info(f"Generating script for {request.niche} on {request.platform}")
        
        # Get template for niche
        template = self.script_templates.get(request.niche, self.script_templates['ai_technology'])
        
        # Create detailed prompt
        prompt = self.create_script_prompt(request, template)
        
        # Generate script using AI
        script_content = await self.ollama.generate_content(prompt)
        
        if not script_content:
            logger.error("Failed to generate script content")
            return {}
        
        # Parse and structure the script
        structured_script = self.structure_script(script_content, request)
        
        # Add metadata
        script_data = {
            'id': str(uuid.uuid4()),
            'niche': request.niche,
            'platform': request.platform,
            'content_type': request.content_type,
            'duration': request.duration,
            'script': structured_script,
            'metadata': {
                'word_count': len(script_content.split()),
                'estimated_duration': self.estimate_duration(script_content),
                'quality_score': self.calculate_quality_score(script_content),
                'trending_keywords': request.trending_keywords or [],
                'affiliate_products': request.affiliate_products or []
            },
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"Generated script: {script_data['id']}")
        return script_data
    
    def create_script_prompt(self, request: ContentRequest, template: Dict) -> str:
        """Create detailed prompt for script generation"""
        
        platform_specs = {
            'tiktok': 'TikTok (vertical, 30-60 seconds, trending sounds, hashtags)',
            'youtube': 'YouTube (horizontal, 8-15 minutes, SEO optimized, engaging)',
            'instagram': 'Instagram Reels (vertical, 30-90 seconds, visual appeal)',
            'facebook': 'Facebook (square/horizontal, 1-3 minutes, shareable)'
        }
        
        prompt = f"""
Create a viral {request.platform} video script for the {request.niche} niche.

PLATFORM: {platform_specs.get(request.platform, request.platform)}
DURATION: {request.duration} seconds
STYLE: {request.style}
TARGET AUDIENCE: {request.target_audience}

REQUIREMENTS:
1. Hook viewers in the first 3 seconds
2. Provide valuable, actionable information
3. Include a strong call-to-action
4. Optimize for {request.platform} algorithm
5. Make it engaging and shareable

STRUCTURE:
- Hook (3 seconds): Attention-grabbing opening
- Content (80% of video): Main value/information
- CTA (10% of video): Clear call-to-action

TONE: {template['tone']}

{f"TRENDING KEYWORDS TO INCLUDE: {', '.join(request.trending_keywords)}" if request.trending_keywords else ""}

{f"AFFILIATE PRODUCTS TO MENTION: {', '.join(request.affiliate_products)}" if request.affiliate_products else ""}

Generate a complete script with:
1. Exact words to say
2. Visual cues and directions
3. Text overlays suggestions
4. Hashtag recommendations
5. Music/sound suggestions

Make it viral-worthy and optimized for maximum engagement!
"""
        
        return prompt
    
    def structure_script(self, content: str, request: ContentRequest) -> Dict:
        """Structure the generated script into components"""
        
        # Simple parsing - in production, use more sophisticated NLP
        lines = content.split('\n')
        
        script_structure = {
            'hook': '',
            'main_content': '',
            'call_to_action': '',
            'visual_cues': [],
            'text_overlays': [],
            'hashtags': [],
            'music_suggestions': []
        }
        
        current_section = 'main_content'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Identify sections
            if 'hook' in line.lower() or 'opening' in line.lower():
                current_section = 'hook'
            elif 'cta' in line.lower() or 'call-to-action' in line.lower() or 'call to action' in line.lower():
                current_section = 'call_to_action'
            elif 'visual' in line.lower():
                current_section = 'visual_cues'
            elif 'text overlay' in line.lower() or 'overlay' in line.lower():
                current_section = 'text_overlays'
            elif 'hashtag' in line.lower():
                current_section = 'hashtags'
            elif 'music' in line.lower() or 'sound' in line.lower():
                current_section = 'music_suggestions'
            else:
                # Add content to current section
                if current_section in ['hook', 'main_content', 'call_to_action']:
                    script_structure[current_section] += line + ' '
                else:
                    script_structure[current_section].append(line)
        
        # Clean up text sections
        for key in ['hook', 'main_content', 'call_to_action']:
            script_structure[key] = script_structure[key].strip()
        
        return script_structure
    
    def estimate_duration(self, content: str) -> int:
        """Estimate video duration based on script length"""
        words = len(content.split())
        # Average speaking rate: 150-160 words per minute
        estimated_seconds = (words / 155) * 60
        return int(estimated_seconds)
    
    def calculate_quality_score(self, content: str) -> float:
        """Calculate quality score for the script"""
        score = 0.0
        
        # Check for hook elements
        hook_words = ['did you know', 'this will', 'secret', 'amazing', 'incredible', 'shocking']
        if any(word in content.lower() for word in hook_words):
            score += 20
        
        # Check for call-to-action
        cta_words = ['subscribe', 'follow', 'like', 'comment', 'share', 'click', 'visit']
        if any(word in content.lower() for word in cta_words):
            score += 20
        
        # Check for engagement elements
        engagement_words = ['you', 'your', 'question', 'comment', 'think', 'experience']
        engagement_count = sum(1 for word in engagement_words if word in content.lower())
        score += min(engagement_count * 5, 20)
        
        # Check length appropriateness
        word_count = len(content.split())
        if 100 <= word_count <= 300:  # Good length for short-form content
            score += 20
        
        # Check for value proposition
        value_words = ['learn', 'discover', 'find out', 'reveal', 'show', 'teach', 'help']
        if any(word in content.lower() for word in value_words):
            score += 20
        
        return min(score, 100.0)

class VideoProductionEngine:
    """Handles video production from scripts"""
    
    def __init__(self):
        self.ffmpeg_path = "/usr/bin/ffmpeg"
        self.storage_path = Path("/opt/content-storage")
        self.temp_path = Path("/tmp/video_production")
        self.temp_path.mkdir(exist_ok=True)
        
        # Video templates for different platforms
        self.video_templates = {
            'tiktok': {
                'resolution': '1080x1920',
                'fps': 30,
                'format': 'mp4',
                'codec': 'libx264',
                'preset': 'fast',
                'crf': 23
            },
            'youtube': {
                'resolution': '1920x1080',
                'fps': 30,
                'format': 'mp4',
                'codec': 'libx264',
                'preset': 'medium',
                'crf': 21
            },
            'instagram': {
                'resolution': '1080x1080',
                'fps': 30,
                'format': 'mp4',
                'codec': 'libx264',
                'preset': 'fast',
                'crf': 23
            },
            'facebook': {
                'resolution': '1280x720',
                'fps': 30,
                'format': 'mp4',
                'codec': 'libx264',
                'preset': 'fast',
                'crf': 24
            }
        }
    
    async def produce_video(self, script_data: Dict) -> Dict:
        """Produce video from script data"""
        logger.info(f"Producing video for script: {script_data['id']}")
        
        start_time = time.time()
        video_id = script_data['id']
        platform = script_data['platform']
        
        # Create working directory
        work_dir = self.temp_path / video_id
        work_dir.mkdir(exist_ok=True)
        
        try:
            # Step 1: Generate voice-over
            audio_path = await self.generate_voiceover(script_data, work_dir)
            
            # Step 2: Create or select background video
            background_path = await self.get_background_video(script_data, work_dir)
            
            # Step 3: Generate subtitles
            subtitle_path = await self.generate_subtitles(script_data, work_dir)
            
            # Step 4: Add text overlays
            overlay_paths = await self.create_text_overlays(script_data, work_dir)
            
            # Step 5: Combine all elements
            final_video_path = await self.combine_video_elements(
                background_path, audio_path, subtitle_path, overlay_paths,
                work_dir, platform
            )
            
            # Step 6: Generate thumbnail
            thumbnail_path = await self.generate_thumbnail(final_video_path, work_dir)
            
            # Step 7: Move to storage
            stored_video_path = await self.store_video(final_video_path, thumbnail_path, video_id)
            
            production_time = time.time() - start_time
            
            video_data = {
                'id': video_id,
                'script_id': script_data['id'],
                'platform': platform,
                'niche': script_data['niche'],
                'video_path': stored_video_path['video'],
                'thumbnail_path': stored_video_path['thumbnail'],
                'duration': script_data['duration'],
                'resolution': self.video_templates[platform]['resolution'],
                'file_size': self.get_file_size(stored_video_path['video']),
                'production_time': production_time,
                'quality_score': await self.calculate_video_quality_score(stored_video_path['video']),
                'metadata': {
                    'audio_generated': bool(audio_path),
                    'background_used': bool(background_path),
                    'subtitles_added': bool(subtitle_path),
                    'overlays_count': len(overlay_paths),
                    'processing_steps': 6
                },
                'created_at': datetime.now().isoformat()
            }
            
            # Cleanup temporary files
            await self.cleanup_temp_files(work_dir)
            
            logger.info(f"Video produced successfully in {production_time:.2f}s: {video_id}")
            return video_data
            
        except Exception as e:
            logger.error(f"Error producing video {video_id}: {e}")
            await self.cleanup_temp_files(work_dir)
            return {}
    
    async def generate_voiceover(self, script_data: Dict, work_dir: Path) -> str:
        """Generate AI voice-over from script"""
        logger.debug(f"Generating voiceover for {script_data['id']}")
        
        # Extract text for voice-over
        script = script_data['script']
        text_content = f"{script['hook']} {script['main_content']} {script['call_to_action']}"
        
        # Clean text for TTS
        clean_text = self.clean_text_for_tts(text_content)
        
        audio_path = work_dir / "voiceover.wav"
        
        # Use espeak as a simple TTS solution (can be replaced with better TTS)
        try:
            cmd = [
                "espeak",
                "-s", "160",  # Speed: 160 words per minute
                "-v", "en+f3",  # Voice: English female
                "-w", str(audio_path),  # Output file
                clean_text
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if audio_path.exists():
                logger.debug(f"Voiceover generated: {audio_path}")
                return str(audio_path)
            else:
                logger.warning("Voiceover generation failed")
                return ""
                
        except Exception as e:
            logger.error(f"Error generating voiceover: {e}")
            return ""
    
    def clean_text_for_tts(self, text: str) -> str:
        """Clean text for text-to-speech"""
        # Remove special characters and formatting
        import re
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove hashtags
        text = re.sub(r'#\w+', '', text)
        
        # Remove mentions
        text = re.sub(r'@\w+', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Limit length for TTS
        words = text.split()
        if len(words) > 200:  # Limit to ~200 words
            text = ' '.join(words[:200])
        
        return text.strip()
    
    async def get_background_video(self, script_data: Dict, work_dir: Path) -> str:
        """Get or generate background video"""
        logger.debug(f"Creating background video for {script_data['id']}")
        
        platform = script_data['platform']
        template = self.video_templates[platform]
        duration = script_data['duration']
        
        background_path = work_dir / "background.mp4"
        
        # Create a simple animated background using FFmpeg
        try:
            cmd = [
                self.ffmpeg_path,
                "-f", "lavfi",
                "-i", f"color=c=0x1a1a2e:size={template['resolution']}:duration={duration}:rate={template['fps']}",
                "-f", "lavfi", 
                "-i", f"color=c=0x16213e:size=200x200:duration={duration}:rate={template['fps']}",
                "-filter_complex", 
                f"[1]scale=200:200[overlay];[0][overlay]overlay=x='if(gte(t,1), -w+t*100, NAN)':y=H/2-h/2:enable='between(t,1,{duration-1})'",
                "-c:v", template['codec'],
                "-preset", template['preset'],
                "-crf", str(template['crf']),
                "-t", str(duration),
                "-y",
                str(background_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if background_path.exists():
                logger.debug(f"Background video created: {background_path}")
                return str(background_path)
            else:
                logger.warning(f"Background video creation failed: {stderr.decode()}")
                return ""
                
        except Exception as e:
            logger.error(f"Error creating background video: {e}")
            return ""
    
    async def generate_subtitles(self, script_data: Dict, work_dir: Path) -> str:
        """Generate subtitle file"""
        logger.debug(f"Generating subtitles for {script_data['id']}")
        
        script = script_data['script']
        text_content = f"{script['hook']} {script['main_content']} {script['call_to_action']}"
        
        subtitle_path = work_dir / "subtitles.srt"
        
        # Simple subtitle generation (can be enhanced with timing analysis)
        words = text_content.split()
        subtitle_content = ""
        
        words_per_subtitle = 5  # 5 words per subtitle
        duration_per_subtitle = 2.5  # 2.5 seconds per subtitle
        
        for i in range(0, len(words), words_per_subtitle):
            subtitle_number = (i // words_per_subtitle) + 1
            start_time = i * duration_per_subtitle / words_per_subtitle
            end_time = start_time + duration_per_subtitle
            
            subtitle_text = ' '.join(words[i:i + words_per_subtitle])
            
            subtitle_content += f"{subtitle_number}\n"
            subtitle_content += f"{self.format_srt_time(start_time)} --> {self.format_srt_time(end_time)}\n"
            subtitle_content += f"{subtitle_text}\n\n"
        
        try:
            async with aiofiles.open(subtitle_path, 'w') as f:
                await f.write(subtitle_content)
            
            logger.debug(f"Subtitles generated: {subtitle_path}")
            return str(subtitle_path)
            
        except Exception as e:
            logger.error(f"Error generating subtitles: {e}")
            return ""
    
    def format_srt_time(self, seconds: float) -> str:
        """Format time for SRT subtitles"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
    
    async def create_text_overlays(self, script_data: Dict, work_dir: Path) -> List[str]:
        """Create text overlay images"""
        logger.debug(f"Creating text overlays for {script_data['id']}")
        
        overlays = script_data['script'].get('text_overlays', [])
        overlay_paths = []
        
        for i, overlay_text in enumerate(overlays[:3]):  # Limit to 3 overlays
            overlay_path = work_dir / f"overlay_{i}.png"
            
            # Create text overlay using ImageMagick (if available) or skip
            try:
                cmd = [
                    "convert",
                    "-size", "800x200",
                    "-background", "transparent",
                    "-fill", "white",
                    "-font", "Arial-Bold",
                    "-pointsize", "48",
                    "-gravity", "center",
                    f"caption:{overlay_text}",
                    str(overlay_path)
                ]
                
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                await process.communicate()
                
                if overlay_path.exists():
                    overlay_paths.append(str(overlay_path))
                    
            except Exception as e:
                logger.debug(f"Text overlay creation skipped (ImageMagick not available): {e}")
                continue
        
        return overlay_paths
    
    async def combine_video_elements(self, background_path: str, audio_path: str, 
                                   subtitle_path: str, overlay_paths: List[str],
                                   work_dir: Path, platform: str) -> str:
        """Combine all video elements into final video"""
        logger.debug(f"Combining video elements for {platform}")
        
        template = self.video_templates[platform]
        final_path = work_dir / f"final_{platform}.{template['format']}"
        
        # Build FFmpeg command
        cmd = [self.ffmpeg_path]
        
        # Input files
        if background_path:
            cmd.extend(["-i", background_path])
        if audio_path:
            cmd.extend(["-i", audio_path])
        
        # Video filters
        filters = []
        
        # Add subtitles if available
        if subtitle_path:
            filters.append(f"subtitles={subtitle_path}:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'")
        
        # Add overlays if available
        for i, overlay_path in enumerate(overlay_paths):
            start_time = i * 10  # Show each overlay for 10 seconds
            filters.append(f"overlay=x=(W-w)/2:y=50:enable='between(t,{start_time},{start_time+5})'")
        
        # Apply filters
        if filters:
            cmd.extend(["-vf", ",".join(filters)])
        
        # Output settings
        cmd.extend([
            "-c:v", template['codec'],
            "-preset", template['preset'],
            "-crf", str(template['crf']),
            "-s", template['resolution'],
            "-r", str(template['fps'])
        ])
        
        # Audio settings
        if audio_path:
            cmd.extend(["-c:a", "aac", "-b:a", "128k"])
        else:
            cmd.extend(["-an"])  # No audio
        
        # Output file
        cmd.extend(["-y", str(final_path)])
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if final_path.exists():
                logger.debug(f"Final video created: {final_path}")
                return str(final_path)
            else:
                logger.error(f"Video combination failed: {stderr.decode()}")
                return ""
                
        except Exception as e:
            logger.error(f"Error combining video elements: {e}")
            return ""
    
    async def generate_thumbnail(self, video_path: str, work_dir: Path) -> str:
        """Generate thumbnail from video"""
        if not video_path:
            return ""
        
        thumbnail_path = work_dir / "thumbnail.jpg"
        
        try:
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-ss", "00:00:03",  # Take frame at 3 seconds
                "-vframes", "1",
                "-q:v", "2",  # High quality
                "-y",
                str(thumbnail_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if thumbnail_path.exists():
                return str(thumbnail_path)
            else:
                return ""
                
        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            return ""
    
    async def store_video(self, video_path: str, thumbnail_path: str, video_id: str) -> Dict:
        """Store video and thumbnail in permanent storage"""
        if not video_path:
            return {}
        
        # Create storage directories
        video_storage = self.storage_path / "videos" / "processed"
        thumbnail_storage = self.storage_path / "videos" / "thumbnails"
        video_storage.mkdir(parents=True, exist_ok=True)
        thumbnail_storage.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"{video_id}_{timestamp}.mp4"
        thumbnail_filename = f"{video_id}_{timestamp}.jpg"
        
        stored_video_path = video_storage / video_filename
        stored_thumbnail_path = thumbnail_storage / thumbnail_filename
        
        try:
            # Copy video file
            import shutil
            shutil.copy2(video_path, stored_video_path)
            
            # Copy thumbnail if available
            if thumbnail_path and Path(thumbnail_path).exists():
                shutil.copy2(thumbnail_path, stored_thumbnail_path)
            
            return {
                'video': str(stored_video_path),
                'thumbnail': str(stored_thumbnail_path) if thumbnail_path else ""
            }
            
        except Exception as e:
            logger.error(f"Error storing video: {e}")
            return {}
    
    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        try:
            return Path(file_path).stat().st_size
        except:
            return 0
    
    async def calculate_video_quality_score(self, video_path: str) -> float:
        """Calculate video quality score"""
        if not video_path or not Path(video_path).exists():
            return 0.0
        
        # Simple quality metrics
        score = 50.0  # Base score
        
        try:
            # Check file size (larger generally means better quality)
            file_size = self.get_file_size(video_path)
            if file_size > 10 * 1024 * 1024:  # > 10MB
                score += 20
            elif file_size > 5 * 1024 * 1024:  # > 5MB
                score += 10
            
            # Check if file is playable
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-f", "null",
                "-"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                score += 30  # Video is playable
            
        except Exception as e:
            logger.debug(f"Quality score calculation error: {e}")
        
        return min(score, 100.0)
    
    async def cleanup_temp_files(self, work_dir: Path):
        """Clean up temporary files"""
        try:
            import shutil
            if work_dir.exists():
                shutil.rmtree(work_dir)
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")

class ContentProductionPipeline:
    """Main content production pipeline orchestrator"""
    
    def __init__(self):
        self.ollama_manager = OllamaClusterManager()
        self.script_generator = ContentScriptGenerator(self.ollama_manager)
        self.video_engine = VideoProductionEngine()
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        
        # Production targets
        self.daily_target = 1000  # 1000 videos per day
        self.batch_size = 50  # Process 50 videos at a time
        
        # Database connection
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'database': 'bookai_analytics'
        }
    
    async def produce_content_batch(self, requests: List[ContentRequest]) -> List[Dict]:
        """Produce a batch of content"""
        logger.info(f"Producing batch of {len(requests)} content pieces")
        
        start_time = time.time()
        results = []
        
        # Process requests in parallel with semaphore for rate limiting
        semaphore = asyncio.Semaphore(10)  # Max 10 concurrent productions
        
        async def process_single_request(request):
            async with semaphore:
                try:
                    # Generate script
                    script_data = await self.script_generator.generate_script(request)
                    if not script_data:
                        return None
                    
                    # Produce video
                    video_data = await self.video_engine.produce_video(script_data)
                    if not video_data:
                        return None
                    
                    # Store in database
                    await self.store_content_data(script_data, video_data)
                    
                    return {
                        'script': script_data,
                        'video': video_data,
                        'status': 'success'
                    }
                    
                except Exception as e:
                    logger.error(f"Error processing request: {e}")
                    return {
                        'request': request,
                        'status': 'failed',
                        'error': str(e)
                    }
        
        # Execute all requests in parallel
        tasks = [process_single_request(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter successful results
        successful_results = [r for r in results if r and r.get('status') == 'success']
        failed_results = [r for r in results if r and r.get('status') == 'failed']
        
        production_time = time.time() - start_time
        
        logger.info(f"Batch completed: {len(successful_results)} successful, {len(failed_results)} failed in {production_time:.2f}s")
        
        # Update metrics
        await self.update_production_metrics(len(successful_results), production_time)
        
        return successful_results
    
    async def store_content_data(self, script_data: Dict, video_data: Dict):
        """Store content data in database"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Store script data
            script_query = """
            INSERT INTO content_scripts 
            (id, niche, platform, content_type, script_data, quality_score, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            script_params = (
                script_data['id'],
                script_data['niche'],
                script_data['platform'],
                script_data['content_type'],
                json.dumps(script_data['script']),
                script_data['metadata']['quality_score'],
                datetime.now()
            )
            
            cursor.execute(script_query, script_params)
            
            # Store video data
            video_query = """
            INSERT INTO content_videos 
            (id, script_id, platform, niche, video_path, thumbnail_path, duration, 
             file_size, production_time, quality_score, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            video_params = (
                video_data['id'],
                video_data['script_id'],
                video_data['platform'],
                video_data['niche'],
                video_data['video_path'],
                video_data['thumbnail_path'],
                video_data['duration'],
                video_data['file_size'],
                video_data['production_time'],
                video_data['quality_score'],
                datetime.now()
            )
            
            cursor.execute(video_query, video_params)
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing content data: {e}")
    
    async def update_production_metrics(self, successful_count: int, production_time: float):
        """Update production metrics in Redis"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            
            # Update daily counters
            self.redis_client.hincrby(f"production_metrics:{today}", "videos_produced", successful_count)
            self.redis_client.hincrbyfloat(f"production_metrics:{today}", "total_time", production_time)
            
            # Set expiration for metrics (30 days)
            self.redis_client.expire(f"production_metrics:{today}", 30 * 24 * 3600)
            
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    async def generate_content_requests(self, count: int) -> List[ContentRequest]:
        """Generate content requests based on optimization data"""
        logger.info(f"Generating {count} content requests")
        
        # Define content distribution
        niches = ['ai_technology', 'business_marketing', 'finance_investing', 'health_fitness', 'lifestyle_travel']
        platforms = ['tiktok', 'youtube', 'instagram', 'facebook']
        
        # Weighted distribution based on performance
        niche_weights = [0.3, 0.25, 0.2, 0.15, 0.1]  # AI tech gets most content
        platform_weights = [0.4, 0.3, 0.2, 0.1]  # TikTok gets most content
        
        requests = []
        
        for i in range(count):
            # Select niche and platform based on weights
            niche = np.random.choice(niches, p=niche_weights)
            platform = np.random.choice(platforms, p=platform_weights)
            
            # Create content request
            request = ContentRequest(
                niche=niche,
                platform=platform,
                content_type="video",
                duration=60 if platform != 'youtube' else 300,  # YouTube gets longer content
                style="educational",
                target_audience="general",
                trending_keywords=self.get_trending_keywords(niche),
                affiliate_products=self.get_affiliate_products(niche)
            )
            
            requests.append(request)
        
        return requests
    
    def get_trending_keywords(self, niche: str) -> List[str]:
        """Get trending keywords for niche"""
        keyword_map = {
            'ai_technology': ['AI', 'ChatGPT', 'automation', 'machine learning', 'artificial intelligence'],
            'business_marketing': ['marketing', 'business', 'entrepreneur', 'sales', 'growth'],
            'finance_investing': ['investing', 'stocks', 'crypto', 'money', 'wealth'],
            'health_fitness': ['fitness', 'health', 'workout', 'nutrition', 'wellness'],
            'lifestyle_travel': ['lifestyle', 'travel', 'adventure', 'experience', 'journey']
        }
        
        return keyword_map.get(niche, [])
    
    def get_affiliate_products(self, niche: str) -> List[str]:
        """Get affiliate products for niche"""
        product_map = {
            'ai_technology': ['AI Automation Course', 'ChatGPT Mastery', 'AI Tools Bundle'],
            'business_marketing': ['Marketing Blueprint', 'Business Growth Course', 'Sales Funnel Template'],
            'finance_investing': ['Investment Course', 'Trading Signals', 'Crypto Guide'],
            'health_fitness': ['Fitness Program', 'Nutrition Guide', 'Workout Equipment'],
            'lifestyle_travel': ['Travel Guide', 'Lifestyle Course', 'Adventure Gear']
        }
        
        return product_map.get(niche, [])
    
    async def run_daily_production(self):
        """Run daily content production to hit 1000 video target"""
        logger.info("🎬 Starting daily content production")
        
        start_time = time.time()
        total_produced = 0
        
        # Calculate batches needed
        batches_needed = self.daily_target // self.batch_size
        
        for batch_num in range(batches_needed):
            logger.info(f"Processing batch {batch_num + 1}/{batches_needed}")
            
            # Generate requests for this batch
            requests = await self.generate_content_requests(self.batch_size)
            
            # Produce content batch
            results = await self.produce_content_batch(requests)
            
            successful_count = len(results)
            total_produced += successful_count
            
            logger.info(f"Batch {batch_num + 1} completed: {successful_count}/{self.batch_size} successful")
            
            # Small delay between batches to prevent system overload
            await asyncio.sleep(5)
        
        total_time = time.time() - start_time
        
        # Generate production report
        report = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'target': self.daily_target,
            'produced': total_produced,
            'success_rate': (total_produced / self.daily_target) * 100,
            'total_time': total_time,
            'average_time_per_video': total_time / total_produced if total_produced > 0 else 0,
            'batches_processed': batches_needed
        }
        
        self.print_production_report(report)
        
        return report
    
    def print_production_report(self, report: Dict):
        """Print production report"""
        print("\n" + "="*60)
        print("🎬 PHASE 1 CONTENT PRODUCTION REPORT")
        print("="*60)
        print(f"📅 Date: {report['date']}")
        print(f"🎯 Target: {report['target']} videos")
        print(f"✅ Produced: {report['produced']} videos")
        print(f"📊 Success Rate: {report['success_rate']:.1f}%")
        print(f"⏱️  Total Time: {report['total_time']:.2f} seconds")
        print(f"⚡ Avg Time/Video: {report['average_time_per_video']:.2f} seconds")
        print(f"📦 Batches Processed: {report['batches_processed']}")
        
        if report['success_rate'] >= 90:
            print("🎉 EXCELLENT: Production target achieved!")
        elif report['success_rate'] >= 80:
            print("✅ GOOD: Production mostly on target")
        else:
            print("⚠️  WARNING: Production below target - optimization needed")
        
        print("="*60 + "\n")

async def main():
    """Main function to run Phase 1 content production"""
    print("🎬 Starting Phase 1: Content Production Pipeline")
    print("Target: Scale to 1,000 videos/day production")
    print("Timeline: Weeks 5-6\n")
    
    pipeline = ContentProductionPipeline()
    
    try:
        # Run daily production
        report = await pipeline.run_daily_production()
        
        print("\n🎉 Phase 1 content production completed!")
        print("💡 Run this script daily to maintain production targets")
        print("📊 Check /var/log/phase1-content-production.log for detailed logs")
        
    except Exception as e:
        logger.error(f"❌ Phase 1 content production failed: {e}")
        print(f"\n❌ Error: {e}")
        print("📋 Check logs for details: /var/log/phase1-content-production.log")

if __name__ == "__main__":
    asyncio.run(main())

