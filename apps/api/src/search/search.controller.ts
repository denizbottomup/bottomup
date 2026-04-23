import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { SearchService, type SearchResults } from './search.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('/search')
  run(@Query('q') q?: string): Promise<SearchResults> {
    return this.search.search(q ?? '');
  }
}
