
import { jobCostService } from './job-cost-service';
import { costItemService } from './cost-item-service';
import { presetService } from './preset-service';
import { presetGenerator } from './presets';

export const costService = {
  ...jobCostService,
  ...costItemService,
  ...presetService,
  getPresetItems: presetGenerator.getPresetItems,
};
