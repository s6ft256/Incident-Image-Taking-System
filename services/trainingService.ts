
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
 * Maps Supabase DB technical errors to professional safety messages.
 */
const handleDBError = (error: any, context: string): string => {
  if (!error) return `Fault in ${context}`;
  if (error.code === '42P01') return `GRID INTEGRITY FAULT: Training registry table is missing.`;
  if (error.code === '23503') return `REFERENCE FAULT: Linked session record could not be established.`;
  return `SYNC ERROR [${context}]: ${error.message || 'Operation failed.'}`;
};

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

  if (sessionError) throw new Error(handleDBError(sessionError, "Session Roster"));

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
      if (traineeError) throw new Error(handleDBError(traineeError, "Trainee Manifest"));
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
    if (photoError) throw new Error(handleDBError(photoError, "Evidence Archiving"));
  }

  return sessionId;
};
