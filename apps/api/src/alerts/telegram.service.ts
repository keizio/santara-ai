import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AnalysisResult } from '@santara/shared';
import { AlertLogEntity } from './entities/alert-log.entity';
import type { AppConfig } from '../config/configuration';

const TONE: Record<string, string> = {
  'strong-bullish': 'STRONG BULLISH',
  bullish: 'BULLISH',
  neutral: 'NEUTRAL',
  bearish: 'BEARISH',
  'strong-bearish': 'STRONG BEARISH',
};

/**
 * Alerts fire only on convictions worth waking someone up for: a non-neutral
 * verdict or a high-severity anomaly such as earnings/flow divergence.
 */
export function shouldAlert(result: AnalysisResult): boolean {
  if (!result.verdict) return false;
  if (Math.abs(result.verdict.score) >= 20) return true;
  return result.verdict.anomalies.some(
    (anomaly) => anomaly.severity === 'high',
  );
}

export function formatAlert(result: AnalysisResult): string {
  const verdict = result.verdict;
  if (!verdict)
    return `${result.company.ticker}: analysis produced no verdict.`;
  const anomalies = verdict.anomalies
    .map((anomaly) => `- ${anomaly.message}`)
    .join('\n');
  const metrics = verdict.keyMetrics
    .map((metric) => `- ${metric.label}: ${metric.value}`)
    .join('\n');
  return [
    `Santara AI — ${result.company.ticker} (${result.company.exchange})`,
    `${TONE[verdict.recommendation] ?? verdict.recommendation} | score ${verdict.score} | confidence ${(verdict.confidence * 100).toFixed(0)}%`,
    '',
    verdict.executiveSummary,
    metrics ? `\nKey metrics:\n${metrics}` : '',
    anomalies ? `\nAnomalies:\n${anomalies}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    @InjectRepository(AlertLogEntity)
    private readonly alerts: Repository<AlertLogEntity>,
  ) {}

  async notifyAnalysis(result: AnalysisResult): Promise<void> {
    if (!shouldAlert(result)) return;
    const message = formatAlert(result);
    const telegram = this.config.get('telegram', { infer: true });

    if (!telegram.enabled || !telegram.botToken || !telegram.chatId) {
      await this.log(result.id, 'skipped', message, null);
      return;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${telegram.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram.chatId,
            text: message,
            disable_web_page_preview: true,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Telegram responded ${response.status}`);
      }
      await this.log(result.id, 'sent', message, null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Telegram alert failed for ${result.company.ticker}: ${reason}`,
      );
      await this.log(result.id, 'failed', message, reason);
    }
  }

  private async log(
    analysisRunId: string | null,
    status: AlertLogEntity['status'],
    message: string,
    error: string | null,
  ): Promise<void> {
    await this.alerts.save(
      this.alerts.create({
        analysisRunId,
        channel: 'telegram',
        status,
        message,
        error,
      }),
    );
  }
}
