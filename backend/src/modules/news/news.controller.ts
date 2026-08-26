import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicNewsQueryDto } from './dto/public-news-query.dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findPublished(@Query() query: PublicNewsQueryDto) {
    return this.newsService.findPublished(query);
  }

  @Get(':slug')
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.newsService.findPublishedBySlug(slug);
  }
}
