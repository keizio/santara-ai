import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from '../alerts/alerts.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { CompanyEntity } from './entities/company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalysisRunEntity, CompanyEntity]),
    AlertsModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
