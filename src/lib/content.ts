import { getCollection, type CollectionEntry } from 'astro:content';
import { TRACKS } from './catalog';

export async function lessonPuzzles(lessonId: string): Promise<CollectionEntry<'puzzles'>[]> {
  const all = await getCollection('puzzles', (p) => p.data.lesson?.id === lessonId);
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** All lessons in curriculum order: by track, then by order within the track. */
export async function sortedLessons(): Promise<CollectionEntry<'lessons'>[]> {
  const trackIndex = (id: string) => TRACKS.findIndex((t) => t.id === id);
  const all = await getCollection('lessons');
  return all.sort((a, b) => trackIndex(a.data.track) - trackIndex(b.data.track) || a.data.order - b.data.order);
}

export async function casePuzzles(caseId: string): Promise<CollectionEntry<'puzzles'>[]> {
  const all = await getCollection('puzzles', (p) => p.data.case?.id === caseId);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function sortedCases(): Promise<CollectionEntry<'cases'>[]> {
  return (await getCollection('cases')).sort((a, b) => a.data.number - b.data.number);
}
