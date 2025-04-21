import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardFooter } from '@/components/primitives/card';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Skeleton } from '@/components/primitives/skeleton';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Topic } from './types';

interface TopicOverviewFormProps {
  topic: Topic;
  readOnly?: boolean;
}

export function TopicOverviewForm({ topic, readOnly = false }: TopicOverviewFormProps) {
  const { register, reset } = useForm<Topic>({
    defaultValues: topic,
  });

  useEffect(() => {
    reset(topic);
  }, [topic, reset]);

  return (
    <div className="p-4">
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Topic name" {...register('name')} readOnly={readOnly} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" placeholder="Topic key" {...register('key')} readOnly={readOnly} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="createdAt">Created At</Label>
                <Input
                  id="createdAt"
                  value={topic.createdAt ? new Date(topic.createdAt).toLocaleString() : '-'}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="updatedAt">Updated At</Label>
                <Input
                  id="updatedAt"
                  value={topic.updatedAt ? new Date(topic.updatedAt).toLocaleString() : '-'}
                  readOnly
                />
              </div>
            </div>
          </div>
        </CardContent>
        {!readOnly && (
          <CardFooter className="bg-muted/20 px-6 py-4">
            <Button type="submit">Save Changes</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export function TopicOverviewSkeleton() {
  return (
    <div className="p-4">
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
