import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import type { RequestLog } from '../../types/logs';
import { ApiTracesContent } from './api-traces-content';

type InboundMailTracesContentProps = {
  log: RequestLog;
};

export function InboundMailTracesContent({ log }: InboundMailTracesContentProps) {
  return (
    <Tabs defaultValue="trace">
      <TabsList variant="regular" className="bg-bg-weak">
        <TabsTrigger variant="regular" size="md" value="trace" className="h-[36px]">
          Trace
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trace">
        <ApiTracesContent log={log} />
      </TabsContent>
    </Tabs>
  );
}
