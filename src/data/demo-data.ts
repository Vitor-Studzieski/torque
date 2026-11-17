import type { Customer } from "@/features/customers/types";
import type { FinanceEntry } from "@/features/finance/types";
import type { Part } from "@/features/inventory/types";
import type { Vehicle } from "@/features/vehicles/types";
import type {
  ApprovalStatus,
  ItemApproval,
  WorkOrder,
  WorkOrderStatus,
} from "@/features/work-orders/types";

export const MECHANICS = ["Rafael Nunes", "Diego Martins", "Bruno Costa", "Marcos Lima"];

const customerNames = [
  "Mariana Oliveira",
  "Lucas Ferreira",
  "Camila Santos",
  "Pedro Almeida",
  "Isabela Rocha",
  "Gabriel Souza",
  "Fernanda Costa",
  "Rafael Martins",
  "Juliana Ribeiro",
  "André Lima",
  "Patrícia Gomes",
  "Thiago Carvalho",
];
const phoneNumbers = [
  "(11) 98812-4501",
  "(11) 97734-1208",
  "(11) 99104-8823",
  "(11) 98671-9012",
  "(11) 97420-2265",
  "(11) 99318-0704",
  "(11) 98136-5432",
  "(11) 98552-1809",
  "(11) 97641-3380",
  "(11) 99285-4617",
  "(11) 98470-2961",
  "(11) 97512-8034",
];
const vehicleSpecs = [
  ["Chevrolet", "Onix LT", 2022, "Prata", 48210],
  ["Hyundai", "HB20 Comfort", 2021, "Branco", 61740],
  ["Toyota", "Corolla XEi", 2023, "Cinza", 29860],
  ["Honda", "Civic Touring", 2020, "Preto", 80620],
  ["Volkswagen", "T-Cross Highline", 2024, "Azul", 14200],
  ["Fiat", "Pulse Audace", 2022, "Vermelho", 39510],
  ["Jeep", "Renegade Sport", 2021, "Cinza", 53200],
  ["Renault", "Kwid Zen", 2023, "Branco", 18340],
  ["Ford", "Ranger XLS", 2022, "Prata", 45110],
  ["Nissan", "Kicks Sense", 2024, "Prata", 11280],
  ["Chevrolet", "Tracker Premier", 2021, "Azul", 66890],
  ["Honda", "Fit EX", 2019, "Vermelho", 91420],
  ["Volkswagen", "Polo Highline", 2023, "Branco", 24770],
  ["Toyota", "Yaris XL", 2020, "Cinza", 72830],
  ["Fiat", "Strada Freedom", 2022, "Branco", 38650],
  ["Hyundai", "Creta Platinum", 2023, "Preto", 31640],
  ["Jeep", "Compass Longitude", 2022, "Verde", 47200],
  ["Chevrolet", "S10 LTZ", 2021, "Prata", 59120],
] as const;
const plates = [
  "BRA2E19",
  "RIO4F21",
  "SPX7B33",
  "GHT3J56",
  "FKA8D10",
  "QWE1A23",
  "MNO5B67",
  "JKL9C01",
  "ABC4D89",
  "DEF7G12",
  "HIJ2K34",
  "LMN5P67",
  "OPQ8R90",
  "STU1V23",
  "VWX4Y56",
  "YZA7B89",
  "BCD0E12",
  "EFG3H45",
];

export const ENTRY_CHECKLIST_LABELS = [
  "Para-choque dianteiro",
  "Para-brisa e vidros",
  "Retrovisores",
  "Faróis e lanternas",
  "Rodas e pneus",
  "Interior e painel",
  "Pertences registrados",
  "Nível de combustível",
];
export const EXIT_CHECKLIST_LABELS = [
  "Serviços conferidos",
  "Peças antigas devolvidas",
  "Veículo limpo",
  "Chaves entregues",
  "Pagamento conferido",
  "Fotos de saída registradas",
];

const orderStatuses: WorkOrderStatus[] = [
  "intake",
  "diagnosis",
  "awaiting-approval",
  "awaiting-approval",
  "waiting-parts",
  "in-progress",
  "in-progress",
  "in-progress",
  "ready",
  "delivered",
  "delivered",
  "cancelled",
  "intake",
  "diagnosis",
  "awaiting-approval",
  "waiting-parts",
  "in-progress",
  "in-progress",
  "ready",
  "delivered",
  "intake",
  "diagnosis",
  "waiting-parts",
  "in-progress",
  "ready",
];
const serviceCatalog = [
  "Revisão preventiva",
  "Troca de óleo e filtros",
  "Diagnóstico eletrônico",
  "Revisão de freios",
  "Alinhamento e balanceamento",
  "Substituição da correia",
  "Manutenção do ar-condicionado",
  "Reparo de suspensão",
  "Revisão do sistema de arrefecimento",
  "Troca de bateria",
];
const complaintCatalog = [
  "Ruído ao frear em baixa velocidade",
  "Luz da injeção acendeu no painel",
  "Revisão antes de viajar",
  "Ar-condicionado perdeu eficiência",
  "Vibração no volante acima de 80 km/h",
  "Motor demora para pegar pela manhã",
  "Barulho na suspensão ao passar em lombadas",
  "Troca de óleo e inspeção geral",
];
const partCatalog = [
  ["FLT-001", "Filtro de óleo", "Filtros", "Tecfil", 38, 72],
  ["OL-005W30", "Óleo sintético 5W30 · 1L", "Lubrificantes", "Mobil", 42, 69],
  ["PST-014", "Pastilha de freio dianteira", "Freios", "Cobreq", 138, 229],
  ["FLT-AR-02", "Filtro de ar do motor", "Filtros", "Mann", 55, 94],
  ["FLT-CAB-11", "Filtro de cabine", "Filtros", "Wega", 48, 86],
  ["VEL-DR-03", "Vela de ignição", "Ignição", "NGK", 32, 58],
  ["BAT-60A", "Bateria 60 Ah", "Elétrica", "Moura", 438, 629],
  ["COR-AC-04", "Correia de acessórios", "Motor", "Continental", 126, 198],
  ["ROL-001", "Rolamento dianteiro", "Suspensão", "SKF", 184, 298],
  ["DIS-280", "Disco de freio dianteiro", "Freios", "Fremax", 208, 339],
  ["LMP-H7", "Lâmpada halógena H7", "Elétrica", "Philips", 34, 59],
  ["LMP-LED", "Lâmpada LED compacta", "Elétrica", "Osram", 89, 149],
  ["FLU-ORG", "Fluido de freio DOT 4", "Fluidos", "Bosch", 29, 51],
  ["FLU-ARREF", "Aditivo de arrefecimento", "Fluidos", "Paraflu", 26, 44],
  ["LIMP-TH", "Limpeza de corpo de borboleta", "Insumos", "Wurth", 48, 82],
  ["SEN-ABS", "Sensor ABS dianteiro", "Elétrica", "Bosch", 195, 315],
  ["AMO-D-01", "Amortecedor dianteiro", "Suspensão", "Cofap", 328, 489],
  ["BUC-BAL", "Bucha da bandeja", "Suspensão", "Axios", 68, 112],
  ["JUN-CAB", "Junta da tampa de válvulas", "Motor", "Sabó", 76, 128],
  ["TENSOR-01", "Tensor da correia", "Motor", "INA", 219, 348],
  ["VELA-CAB", "Cabo de vela", "Ignição", "NGK", 112, 184],
  ["BOB-IGN", "Bobina de ignição", "Ignição", "Delphi", 258, 398],
  ["PNEU-195", "Pneu 195/55 R16", "Pneus", "Continental", 432, 649],
  ["PAL-14", "Palheta do limpador", "Acessórios", "Dyna", 48, 82],
  ["FUS-15", "Fusível automotivo 15A", "Elétrica", "DNI", 5, 12],
  ["MANG-AR", "Mangueira do radiador", "Arrefecimento", "Gates", 94, 158],
  ["BOM-AG", "Bomba d'água", "Arrefecimento", "Nakata", 248, 389],
  ["ATF-01", "Fluido de transmissão ATF", "Fluidos", "Petronas", 68, 112],
  ["DIS-TR", "Disco de freio traseiro", "Freios", "Fremax", 184, 296],
  ["KIT-EMB", "Kit de embreagem", "Transmissão", "Luk", 728, 1_090],
] as const;

const statusApproval: Record<WorkOrderStatus, ApprovalStatus> = {
  intake: "not-sent",
  diagnosis: "not-sent",
  "awaiting-approval": "pending",
  "waiting-parts": "approved",
  "in-progress": "approved",
  ready: "approved",
  delivered: "approved",
  cancelled: "rejected",
};

function atDay(dayOffset: number, hour = 9) {
  return new Date(2026, 10, 17 + dayOffset, hour, 0, 0).toISOString();
}

function checklist(labels: string[], checkedBefore: number) {
  return labels.map((label, index) => ({
    id: `${label.toLowerCase().replaceAll(" ", "-")}-${index}`,
    label,
    checked: index < checkedBefore,
  }));
}

function makeCustomers(): Customer[] {
  return customerNames.map((name, index) => ({
    id: `customer-${index + 1}`,
    name,
    phone: phoneNumbers[index]!,
    email: `${name.toLowerCase().replaceAll(" ", ".")}@exemplo.com.br`,
    createdAt: index === 0 ? atDay(-7, 10) : atDay(-220 + index * 13, 10),
    notes: index % 4 === 0 ? "Prefere receber atualizações por mensagem." : "",
  }));
}

function makeVehicles(): Vehicle[] {
  return vehicleSpecs.map(([make, model, year, color, mileage], index) => ({
    id: `vehicle-${index + 1}`,
    customerId: `customer-${(index % 12) + 1}`,
    plate: plates[index]!,
    make,
    model,
    year,
    color,
    mileage,
    fuelPercent: [25, 50, 75, 100][index % 4]!,
  }));
}

function makeParts(): Part[] {
  return partCatalog.map(([code, name, category, brand, costPrice, salePrice], index) => ({
    id: `part-${index + 1}`,
    code,
    name,
    category,
    brand,
    quantity: index === 5 || index === 18 ? 1 : index === 27 ? 0 : (index * 3 + 4) % 18,
    minimumQuantity: index % 4 === 0 ? 5 : 3,
    costPrice,
    salePrice,
  }));
}

function makeWorkOrders(vehicles: Vehicle[]): WorkOrder[] {
  return orderStatuses.map((status, index) => {
    const vehicle = vehicles[index % vehicles.length]!;
    const ageDays = index === 10 ? 115 : index === 11 ? 150 : (index * 3) % 22;
    const openedAt = atDay(-ageDays, 8 + (index % 8));
    const serviceName = serviceCatalog[index % serviceCatalog.length]!;
    const partOffset = index === 4 ? 27 : (index * 2) % partCatalog.length;
    const selectedPart = partCatalog[partOffset]!;
    const isActive = status !== "delivered" && status !== "cancelled";
    const isCompleted = status === "delivered" || status === "ready";
    const approval = statusApproval[status];
    const itemApproval: ItemApproval =
      approval === "approved" || approval === "partial"
        ? "approved"
        : approval === "rejected"
          ? "rejected"
          : "pending";

    return {
      id: `work-order-${index + 1}`,
      code: `OS-${1042 - index}`,
      customerId: vehicle.customerId,
      vehicleId: vehicle.id,
      status,
      openedAt,
      expectedAt:
        status === "ready"
          ? atDay(0, 17)
          : status === "delivered" || status === "cancelled"
            ? atDay(-ageDays + 2, 17)
            : atDay(index === 7 ? -3 : 2, 17),
      mileageIn: vehicle.mileage + index * 420,
      fuelPercent: [20, 35, 50, 65, 80][index % 5]!,
      damageAreas: index % 4 === 0 ? ["front", "right"] : [],
      complaint: complaintCatalog[index % complaintCatalog.length]!,
      diagnosis:
        index % 3 === 0 ? "Inspeção inicial concluída. Aguardando validação do cliente." : "",
      mechanic: MECHANICS[index % MECHANICS.length]!,
      approval,
      services: [
        {
          id: `service-${index + 1}-a`,
          name: serviceName,
          description: "Mão de obra e inspeção conforme necessidade identificada.",
          laborPrice: 180 + (index % 5) * 45,
          status: isCompleted ? "done" : status === "in-progress" ? "in-progress" : "todo",
          approval: itemApproval,
        },
        ...(index % 3 === 0
          ? [
              {
                id: `service-${index + 1}-b`,
                name: "Inspeção complementar",
                description: "Verificação visual dos itens relacionados ao relato.",
                laborPrice: 95,
                status: isCompleted ? ("done" as const) : ("todo" as const),
                approval: itemApproval,
              },
            ]
          : []),
      ],
      parts:
        index % 4 === 1
          ? []
          : [
              {
                id: `use-${index + 1}`,
                partId: `part-${partOffset + 1}`,
                name: selectedPart[1],
                quantity: 1 + (index % 2),
                unitPrice: selectedPart[5],
                unitCost: selectedPart[4],
                installed: status === "in-progress" || isCompleted,
                approval: itemApproval,
              },
            ],
      evidence: [
        {
          id: `evidence-${index + 1}-entry`,
          category: "entry",
          title: "Entrada do veículo",
          caption: "Registro demonstrativo da chegada à oficina.",
          createdAt: openedAt,
          variant: index % 5,
        },
        ...(index % 4 === 0
          ? [
              {
                id: `evidence-${index + 1}-damage`,
                category: "damage" as const,
                title: "Avaria identificada",
                caption: "Detalhe registrado durante a inspeção inicial.",
                createdAt: atDay(-ageDays, 9),
                variant: (index + 2) % 5,
              },
            ]
          : []),
        ...(status === "in-progress" || isCompleted
          ? [
              {
                id: `evidence-${index + 1}-part`,
                category: "part" as const,
                title: "Peça substituída",
                caption: "Componente removido registrado para conferência.",
                createdAt: atDay(-ageDays + 1, 13),
                variant: (index + 1) % 5,
              },
            ]
          : []),
        ...(status === "delivered"
          ? [
              {
                id: `evidence-${index + 1}-delivery`,
                category: "delivery" as const,
                title: "Saída do veículo",
                caption: "Registro demonstrativo da entrega ao cliente.",
                createdAt: atDay(-ageDays + 2, 16),
                variant: (index + 3) % 5,
              },
            ]
          : []),
      ],
      timeline: [
        {
          id: `timeline-${index + 1}-entry`,
          title: "Veículo recebido",
          detail: "Checklist de entrada iniciado.",
          createdAt: openedAt,
          actor: "Mariana · Atendimento",
        },
        ...(approval !== "not-sent"
          ? [
              {
                id: `timeline-${index + 1}-approval`,
                title: approval === "pending" ? "Orçamento enviado" : "Orçamento aprovado",
                detail: "Atualização demonstrativa do orçamento.",
                createdAt: atDay(-((index * 3) % 22), 11),
                actor: "Mariana · Atendimento",
              },
            ]
          : []),
      ],
      entryChecklist: checklist(ENTRY_CHECKLIST_LABELS, 5 + (index % 4)),
      exitChecklist: checklist(
        EXIT_CHECKLIST_LABELS,
        status === "delivered" ? EXIT_CHECKLIST_LABELS.length : isCompleted ? 3 : 0,
      ),
      paymentStatus: status === "delivered" ? (index % 2 === 0 ? "paid" : "pending") : "pending",
      priority: isActive && index % 7 === 0 ? ("urgent" as const) : ("normal" as const),
      updatedAt: atDay(-ageDays, 14),
    };
  });
}

function makeFinanceEntries(workOrders: WorkOrder[]): FinanceEntry[] {
  const entries: FinanceEntry[] = [];
  const categories = ["Mão de obra", "Peças", "Fornecedor", "Despesas fixas", "Serviços externos"];

  for (let index = 0; index < 40; index += 1) {
    const offset = index % 20;
    const type = index % 4 === 0 ? "payable" : "receivable";
    const dueOffset = (index % 18) - 8;
    const status = index % 3 === 0 ? "paid" : dueOffset < 0 ? "overdue" : "pending";
    const order = workOrders[(index * 3) % workOrders.length]!;
    const amount =
      type === "receivable" ? 280 + ((index * 137) % 2_450) : 95 + ((index * 83) % 1_180);

    entries.push({
      id: `finance-${index + 1}`,
      description:
        type === "receivable"
          ? `${order.code} · ${index % 2 === 0 ? "Serviço" : "Peças"}`
          : `${categories[index % categories.length]} · ${["Auto Peças Central", "Distribuidora ABC", "Energia e água", "Fornecedor de filtros"][index % 4]}`,
      type,
      category: categories[index % categories.length]!,
      amount,
      dueDate: atDay(dueOffset, 12),
      ...(status === "paid"
        ? {
            paidAt: atDay(Math.min(dueOffset, 0), 15),
            paymentMethod: ["Pix", "Cartão", "Dinheiro"][index % 3]!,
          }
        : {}),
      status,
      ...(type === "receivable" ? { workOrderId: order.id } : {}),
    });
  }

  return entries;
}

export function createDemoData() {
  const customers = makeCustomers();
  const vehicles = makeVehicles();
  const workOrders = makeWorkOrders(vehicles);
  const parts = makeParts();
  for (const order of workOrders) {
    for (const usage of order.parts) {
      if (!usage.installed) continue;
      const part = parts.find((item) => item.id === usage.partId);
      if (part) part.quantity = Math.max(0, part.quantity - usage.quantity);
    }
  }
  const financeEntries = makeFinanceEntries(workOrders);

  return { customers, vehicles, workOrders, parts, financeEntries, mechanics: [...MECHANICS] };
}
