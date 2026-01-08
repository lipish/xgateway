import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelServiceForm } from "@/components/ModelServiceForm";
import { Plus } from "lucide-react";

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">模型服务管理</h1>
            <p className="text-muted-foreground">管理您的 AI 模型服务配置</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加服务
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">暂无模型服务，点击上方按钮添加</p>
        </div>
      </div>

      <ModelServiceForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default Index;
