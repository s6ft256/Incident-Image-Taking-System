
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';
import { TraineeRow, UploadedImage } from '../types';

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

export interface TrainingSessionData {
  id?: string;
  projectName: string;
  locationText: string;
  gpsCoordinates?: string;
  contractor: string;
  topicDiscussed: string;
  conductedBy: string;
  conductorSignature: string;
  trainees: TraineeRow[];
  images: any[]; 
  created_at?: string;
}

const handleDBError = (error: any, context: string): string => {
  if (!error) return `Fault in ${context}`;
  if (error.code === '42P01') return `GRID INTEGRITY FAULT: Training registry table is missing.`;
  return `SYNC ERROR [${context}]: ${error.message || 'Operation failed.'}`;
};

export const getTrainingHistory = async (): Promise<TrainingSessionData[]> => {
  const { data: sessions, error } = await supabase
    .from('training_sessions')
    .select(`
      *,
      training_trainees (*),
      training_photos (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(handleDBError(error, "HISTORY_RETRIEVAL"));

  return sessions.map(s => ({
    id: s.id,
    projectName: s.project_name,
    locationText: s.location_text,
    contractor: s.contractor,
    topicDiscussed: s.topic_discussed,
    conductedBy: s.conducted_by_name,
    conductorSignature: s.conductor_signature_text,
    created_at: s.created_at,
    trainees: s.training_trainees.map((t: any) => ({
      id: t.id,
      name: t.name,
      companyNo: t.company_no,
      designation: t.designation,
      isSigned: t.is_signed,
      signTimestamp: t.sign_timestamp_text
    })),
    images: s.training_photos.map((p: any) => ({
      serverUrl: p.image_url
    }))
  }));
};

export const saveTrainingRoster = async (data: TrainingSessionData): Promise<string> => {
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

  if (sessionError) throw new Error(handleDBError(sessionError, "SESSION ROSTER"));

  const sessionId = session.id;

  if (data.trainees && data.trainees.length > 0) {
    const traineesToInsert = data.trainees
      .filter(t => t.name && t.name.trim() !== '')
      .map(t => ({
        session_id: sessionId,
        name: t.name,
        company_no: t.companyNo || 'N/A',
        designation: t.designation || 'Trainee',
        is_signed: t.isSigned || false,
        sign_timestamp_text: t.signTimestamp || ''
      }));

    if (traineesToInsert.length > 0) {
      const { error: traineeError } = await supabase
        .from('training_trainees')
        .insert(traineesToInsert);
      if (traineeError) throw new Error(handleDBError(traineeError, "TRAINEE MANIFEST"));
    }
  }

  const successfulImages = data.images.filter(img => img.status === 'success' && img.serverUrl);
  if (successfulImages.length > 0) {
    const photosToInsert = successfulImages.map(img => ({
      session_id: sessionId,
      image_url: img.serverUrl
    }));

    const { error: photoError } = await supabase
      .from('training_photos')
      .insert(photosToInsert);
    if (photoError) throw new Error(handleDBError(photoError, "EVIDENCE ARCHIVING"));
  }

  return sessionId;
};
