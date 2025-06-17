export interface GenerateMeshPayload {
  mode?: "preview" | "final" | "rodin";
  prompt: string;
  art_style?: "realistic" | "cartoon" | "sculpture";
  should_remesh?: boolean;
}

export interface MeshApiResponse {
  result: string;
}

export interface MeshResultResponse {
  id: string;
  model_urls: {
    glb: string;
    fbx: string;
    obj: string;
    mtl: string;
    usdz: string;
  };
  thumbnail_url: string;
  prompt: string;
  art_style: string;
  progress: number;
  status: string;
}

export interface MeshData {
  id: string;
  prompt: string;
  modelType: string;
  modelUrlGlb: string;
  modelUrlFbx: string;
  modelUrlObj: string;
  previewImage: string;
  state: string;
  taskId: string;
  userId?: string;
  telegramUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}
