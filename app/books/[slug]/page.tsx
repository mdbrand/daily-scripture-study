import { notFound } from 'next/navigation';
import ArticleView from '../../ArticleView';
import { articleBy } from '@/lib/articles';
import { metadataFor, paramsFor } from '@/lib/articles/page';

export const dynamicParams = false;
export const generateStaticParams = paramsFor('books');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return metadataFor('books', (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBy('books', (await params).slug);
  if (!a) notFound();
  return <ArticleView a={a} />;
}
