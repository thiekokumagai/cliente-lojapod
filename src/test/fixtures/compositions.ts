import type { PublicProductCompositions } from "@/services/compositions";

// Formato devolvido por api-lojapod (compositions.service.ts, getProductCompositionsForStore).
// Dados de exemplo, sem relação com lojas reais.
export const apiResponse: PublicProductCompositions = {
  product: { id: "pMarmita", title: "Marmita", price: 25, promotionalPrice: null, isCustomizable: true, isVisible: true },
  stages: [
    {
      id: "pc1",
      groupId: "gCarne",
      name: "Carne",
      description: null,
      minQuantity: 1,
      maxQuantity: 3,
      freeQuantity: 0,
      sortOrder: 0,
      options: [
        { id: "optPicanha", name: "Picanha", description: null, imageUrl: null, price: 15, maxQuantityPerItem: 2, sortOrder: 0 },
      ],
    },
    {
      id: "pc2",
      groupId: "gMolhos",
      name: "Molhos",
      description: null,
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 2,
      sortOrder: 1,
      options: [
        { id: "optMolho1", name: "Molho 1", description: null, imageUrl: null, price: 3, maxQuantityPerItem: 2, sortOrder: 1 },
        { id: "optMolho2", name: "Molho 2", description: null, imageUrl: null, price: 3, maxQuantityPerItem: 2, sortOrder: 2 },
        { id: "optMolho3", name: "Molho 3", description: null, imageUrl: null, price: 3, maxQuantityPerItem: 2, sortOrder: 3 },
      ],
    },
  ],
};
