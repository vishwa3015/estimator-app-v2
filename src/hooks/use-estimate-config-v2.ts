import { useState, useEffect, useCallback } from 'react';
import { configServiceV2, EstimateConfigV2 } from '@/services/estimates/config-service-v2';
import { FormEngineV2 } from '@/services/estimates/form-engine-v2';
import { useToast } from '@/components/ui/use-toast';
import { EstimateConfigData, FormValues } from '@/types/estimate-items';

export const useEstimateConfigV2 = () => {
  const [config, setConfig] = useState<EstimateConfigV2 | null>(null);
  const [formEngine, setFormEngine] = useState<FormEngineV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load user's configuration
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userConfig = await configServiceV2.getOrCreateDefaultConfig();
      setConfig(userConfig);
      
      // Initialize form engine with the configuration
      const engine = new FormEngineV2(userConfig);
      setFormEngine(engine);
      
    } catch (err) {
      console.error('Error loading configuration:', err);
      setError('Failed to load configuration');
      toast({
        title: 'Configuration Error',
        description: 'Failed to load estimate configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Save configuration
  const saveConfig = useCallback(async (configData: EstimateConfigData, configName?: string) => {
    try {
      if (!config) {
        throw new Error('No configuration loaded');
      }

      const updatedConfig = await configServiceV2.saveConfig(configData, configName);
      setConfig(updatedConfig);
      
      // Update form engine
      if (formEngine) {
        formEngine.updateConfig(updatedConfig);
      }

      toast({
        title: 'Configuration Saved',
        description: 'Your estimate configuration has been saved successfully.',
      });

      return updatedConfig;
    } catch (err) {
      console.error('Error saving configuration:', err);
      toast({
        title: 'Save Error',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  }, [config, formEngine, toast]);

  // Reload configuration
  const reloadConfig = useCallback(() => {
    loadConfig();
  }, [loadConfig]);

  // Initialize on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    formEngine,
    isLoading,
    error,
    saveConfig,
    reloadConfig,
    
    // Helper methods
    getSections: () => formEngine?.getSections() || [],
    getSectionConfig: (sectionId: string) => formEngine?.getSectionConfig(sectionId) || null,
    getSectionFields: (sectionId: string) => formEngine?.getSectionFields(sectionId) || [],
    validateSection: (sectionId: string, formData: FormValues) => 
      formEngine?.validateSection(sectionId, formData) || { isValid: false, errors: ['Form engine not initialized'] },
    generateDefaultFormData: (sectionId: string) => 
      formEngine?.generateDefaultFormData(sectionId) || {},
  };
};