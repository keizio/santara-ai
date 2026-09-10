import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type {
  AnalysisResult,
  CompanyRef,
  QueryPlan,
  ScreenResult,
} from '@santara/shared';
import { AnalysisService } from './analysis.service';
import {
  CreateAnalysisDto,
  ListAnalysesDto,
  ListCompaniesDto,
  PlanQueryDto,
  ScreenDto,
} from './dto/analysis.dto';

@Controller()
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get('health')
  health(): { status: 'ok'; usesFixtures: boolean } {
    return { status: 'ok', usesFixtures: this.analysis.usesFixtures };
  }

  @Get('companies')
  companies(@Query() query: ListCompaniesDto): Promise<CompanyRef[]> {
    return this.analysis.listCompanies(query);
  }

  @Post('queries/plan')
  plan(@Body() dto: PlanQueryDto): Promise<QueryPlan> {
    return this.analysis.plan(dto.query);
  }

  @Post('screener')
  screen(@Body() dto: ScreenDto): Promise<ScreenResult> {
    return this.analysis.screen(dto);
  }

  @Post('analyses')
  create(@Body() dto: CreateAnalysisDto): Promise<AnalysisResult> {
    return this.analysis.create(dto);
  }

  @Get('analyses')
  list(@Query() query: ListAnalysesDto): Promise<AnalysisResult[]> {
    return this.analysis.list(query);
  }

  @Get('analyses/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AnalysisResult> {
    return this.analysis.findOne(id);
  }
}
