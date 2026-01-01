import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';
import { TraineeRow, UploadedImage } from '../types';

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

export interface TrainingSessionData {
  projectName: string;
  locationText: string;
  gpsCoordinates?: string;
  contractor: string;
  topicDiscussed: string;
  conductedBy: string;
  conductorSignature: string;
  trainees: TraineeRow[];
  images: UploadedImage[];
}

/**
 * Persists a full training roster including trainees and evidence links to Supabase.
 */
export const saveTrainingRoster = async (data: TrainingSessionData): Promise<string> => {
  // 1. Insert Main Session Record
  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .insert([{
      project_name: data.projectName,
      location_text: data.locationText,
      contractor: data.contractor,
      topic_discussed: data.topicDiscussed,
      conducted_by_name: data.conductedBy,
      conductor_signature_text: data.conductorSignature
    }])
    .select()
    .single();

  if (sessionError) throw new Error(`Session Init Failed: ${sessionError.message}`);

  const sessionId = session.id;

  // 2. Insert Trainees
  if (data.trainees.length > 0) {
    const traineesToInsert = data.trainees
      .filter(t => t.name.trim() !== '')
      .map(t => ({
        session_id: sessionId,
        name: t.name,
        company_no: t.companyNo,
        designation: t.designation,
        is_signed: t.isSigned,
        sign_timestamp_text: t.signTimestamp
      }));

    if (traineesToInsert.length > 0) {
      const { error: traineeError } = await supabase
        .from('training_trainees')
        .insert(traineesToInsert);
      if (traineeError) console.error("Trainee insertion warning:", traineeError.message);
    }
  }

  // 3. Insert Evidence Links (Photos)
  const successfulImages = data.images.filter(img => img.status === 'success' && img.serverUrl);
  if (successfulImages.length > 0) {
    const photosToInsert = successfulImages.map(img => ({
      session_id: sessionId,
      image_url: img.serverUrl
    }));

    const { error: photoError } = await supabase
      .from('training_photos')
      .insert(photosToInsert);
    if (photoError) console.error("Evidence linking warning:", photoError.message);
  }

  return sessionId;
};
