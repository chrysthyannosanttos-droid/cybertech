import * as faceapi from 'face-api.js';

class FaceRecognitionService {
  private modelsLoaded = false;
  private labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];
  private faceMatcher: faceapi.FaceMatcher | null = null;

  async loadModels() {
    if (this.modelsLoaded) return;
    
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    this.modelsLoaded = true;
    console.log('FaceAPI Models Loaded');
  }

  async train(employees: { id: string; name: string; photo_reference_url: string }[]) {
    const descriptors: faceapi.LabeledFaceDescriptors[] = [];

    for (const emp of employees) {
      if (!emp.photo_reference_url) continue;

      try {
        const img = await faceapi.fetchImage(emp.photo_reference_url);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          descriptors.push(new faceapi.LabeledFaceDescriptors(emp.id, [detection.descriptor]));
          console.log(`Face trained for: ${emp.name}`);
        }
      } catch (err) {
        console.warn(`Could not train face for ${emp.name}:`, err);
      }
    }

    this.labeledDescriptors = descriptors;
    if (descriptors.length > 0) {
      this.faceMatcher = new faceapi.FaceMatcher(descriptors, 0.6); // 0.6 threshold
    }
  }

  async identify(videoElement: HTMLVideoElement): Promise<string | null> {
    if (!this.faceMatcher) return null;

    const detection = await faceapi
      .detectSingleFace(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    const bestMatch = this.faceMatcher.findBestMatch(detection.descriptor);
    if (bestMatch.label === 'unknown') return null;
    
    return bestMatch.label; // Returns the employee ID
  }
}

export const faceService = new FaceRecognitionService();
