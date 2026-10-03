import { MLTransitionFeatureInput, MLTransitionPrediction, MLModelMetadata } from '../types/ml.ts';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
const ML_TIMEOUT_MS = 2500;

export class MLClientService {
  /**
   * Health check to inspect if the FastAPI microservice and model artifact are ready.
   */
  static async checkHealth(): Promise<{ operational: boolean; metadata?: any; reason?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      const response = await fetch(`${ML_SERVICE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { operational: false, reason: `HTTP ${response.status} from ML service` };
      }

      const data = await response.json();
      return { operational: Boolean(data.model_loaded), metadata: data };
    } catch (err: any) {
      return {
        operational: false,
        reason: err.name === 'AbortError' ? 'ML service timeout (>2.5s)' : 'ML service offline (Connection refused)'
      };
    }
  }

  /**
   * Fetches full model metadata (offline metrics, confusion matrix, hyperparameters).
   */
  static async getModelMetadata(): Promise<MLModelMetadata | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      const response = await fetch(`${ML_SERVICE_URL}/model-metadata`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Queries the FastAPI service for a career transition readiness prediction.
   * If service is offline, gracefully degrades without generating fake numbers.
   */
  static async predictTransitionReadiness(
    features: MLTransitionFeatureInput
  ): Promise<MLTransitionPrediction> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      const response = await fetch(`${ML_SERVICE_URL}/predict-transition-readiness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(features),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          available: false,
          reason: `ML service returned status ${response.status}: ${errorText.slice(0, 100)}`
        };
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      return {
        available: true,
        prediction: data.prediction,
        readiness_score: data.readiness_score,
        class_probabilities: data.class_probabilities,
        model_version: data.model_version,
        algorithm: data.algorithm,
        top_contributing_features: data.top_contributing_features || [],
        disclaimer: data.disclaimer,
        latency_ms: latency
      };
    } catch (err: any) {
      return {
        available: false,
        reason: err.name === 'AbortError'
          ? 'ML service timed out (>2.5s)'
          : 'ML inference service is offline. Showing deterministic PathForge analysis.'
      };
    }
  }
}
