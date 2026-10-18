import { getCollection, type CollectionEntry } from 'astro:content';

export async function lessonPuzzles(lessonId: string): Promise<CollectionEntry<'puzzles'>[]> {
  const all = await getCollection('puzzles', (p) => p.data.lesson.id === lessonId);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function sortedLessons(): Promise<CollectionEntry<'lessons'>[]> {
  const all = await getCollection('lessons');
  return all.sort((a, b) => a.data.order - b.data.order);
}
