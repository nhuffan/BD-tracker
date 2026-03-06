"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MasterManager from "./MasterManager";

export default function DataPage() {
  return (
    <Tabs defaultValue="bd" className="w-full">
      <TabsList>
        <TabsTrigger value="bd">BD Info</TabsTrigger>
        <TabsTrigger value="bd_level">BD Levels</TabsTrigger>
        <TabsTrigger value="customer_type">Customer Types</TabsTrigger>
        <TabsTrigger value="point_type">Point Types</TabsTrigger>
      </TabsList>

      <TabsContent value="bd" className="mt-4">
        <MasterManager category="bd" />
      </TabsContent>

      <TabsContent value="bd_level" className="mt-4">
        <MasterManager category="bd_level" />
      </TabsContent>

      <TabsContent value="customer_type" className="mt-4">
        <MasterManager category="customer_type" />
      </TabsContent>

      <TabsContent value="point_type" className="mt-4">
        <MasterManager category="point_type" />
      </TabsContent>
    </Tabs>
  );
}