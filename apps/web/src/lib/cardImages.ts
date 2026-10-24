import type {
  BuildingType,
  EventKind,
  MetropolisBKind,
  MetropolisCard,
  Resource,
} from '@catankard/engine';
import { assetUrl } from './assetUrl.ts';

export function getResourceImageUrl(resource: Resource): string {
  return assetUrl(`/assets/cards/resource/resource_${resource}.png`);
}

export function getBuildingImageUrl(type: BuildingType): string {
  return assetUrl(`/assets/cards/building/building_${type}.png`);
}

export function getMetropolisImageUrl(card: MetropolisCard): string {
  if (card.side === 'A') {
    return assetUrl('/assets/cards/building/metropolis_A.png');
  }
  const kind = card.kind ?? 'knights';
  return assetUrl(`/assets/cards/building/metropolis_B_${kind}.png`);
}

export function getEventImageUrl(kind: EventKind): string {
  return assetUrl(`/assets/cards/event/event_${kind}.png`);
}

export function getBonusImageUrl(bonus: 'longest_route' | 'largest_army'): string {
  return assetUrl(`/assets/cards/bonus/bonus_${bonus}.png`);
}

export interface CostItem {
  resource: Resource;
  count: number;
}

export interface CardDetails {
  name: string;
  category: string;
  cost?: string;
  costResources?: CostItem[];
  vp?: number;
  description: string;
  effect?: string;
  imageUrl: string;
}

function getRawCardDetails(
  type: BuildingType | 'metropolis' | EventKind | 'longest_route' | 'largest_army' | Resource,
  subKind?: MetropolisBKind
): CardDetails {
  switch (type) {
    case 'road':
      return {
        name: 'Yol (Road)',
        category: 'İnşaat Kartı',
        cost: '1 Tuğla + 1 Odun',
        costResources: [
          { resource: 'brick', count: 1 },
          { resource: 'wood', count: 1 },
        ],
        vp: 0,
        effect: '1 Yol = 4:1, 2 Yol = 3:1, 3 Yol = 2:1, 4+ Yol = 1:1 takas indirimi.',
        description: 'Yol takas oranı sağlar: 1 yol = 4:1, 2 yol = 3:1, 3 yol = 2:1, 4+ yol = 1:1. 3 yola ilk ulaşan En Uzun Yol bonusunu (2 ZP) alır.',
        imageUrl: '/assets/cards/building/building_road.png',
      };
    case 'knight':
      return {
        name: 'Şövalye (Knight)',
        category: 'İnşaat Kartı',
        cost: '1 Yün + 1 Buğday + 1 Demir',
        costResources: [
          { resource: 'wool', count: 1 },
          { resource: 'wheat', count: 1 },
          { resource: 'ore', count: 1 },
        ],
        vp: 0,
        effect: '+1 Güvenli Kart Limiti (Hırsız eşiği: 7 + şövalye sayısı).',
        description: 'Hırsız el limitini şövalye başına +1 artırır (Limit = 7 + şövalye sayısı). 2 şövalyeye ilk ulaşan En Güçlü Ordu bonusunu (2 ZP) alır.',
        imageUrl: '/assets/cards/building/building_knight.png',
      };
    case 'settlement':
      return {
        name: 'Köy (Settlement)',
        category: 'İnşaat Kartı',
        cost: '1 Tuğla + 1 Odun + 1 Yün + 1 Buğday',
        costResources: [
          { resource: 'brick', count: 1 },
          { resource: 'wood', count: 1 },
          { resource: 'wool', count: 1 },
          { resource: 'wheat', count: 1 },
        ],
        vp: 1,
        effect: '1x ◈ (Kurulduğunda 1 Olay kartı çekilir ve derhal çözülür).',
        description: '1 Zafer Puanı kazandırır. İnşa edildiğinde derhal 1 Olay kartı çekilir ve çözülür. Üzerine Şehir kurulabilir.',
        imageUrl: '/assets/cards/building/building_settlement.png',
      };
    case 'city':
      return {
        name: 'Şehir (City)',
        category: 'İnşaat Kartı',
        cost: '3 Demir + 2 Buğday',
        costResources: [
          { resource: 'ore', count: 3 },
          { resource: 'wheat', count: 2 },
        ],
        vp: 2,
        effect: 'Sıra sendeyken: +🃏 (Hasat fazında fazladan +1 kaynak çektirir).',
        description: 'Açık bir Köyün üzerine kurulur. Alttaki köy artık puan vermez (net +1 ZP, toplam 2 ZP). Kendi turunda Hasat fazında +1 ek kaynak çektirir. Üzerine Büyükşehir kurulabilir.',
        imageUrl: '/assets/cards/building/building_city.png',
      };
    case 'metropolis': {
      if (subKind === 'knights') {
        return {
          name: 'Büyükşehir (B) - Şövalyeler',
          category: 'Büyükşehir Kartı',
          cost: '3 Yün + 1 Demir',
          costResources: [
            { resource: 'wool', count: 3 },
            { resource: 'ore', count: 1 },
          ],
          vp: 3,
          effect: 'Hasat fazında +1 kaynak. İnşa edildiğinde sahip olunan her şövalye için 1 kaynak çekilir.',
          description: 'Açık bir Şehrin üzerine kurulur. Hasat fazında +1 ek kaynak kazandırır. İnşa edildiğinde, o ana kadar inşa edilmiş her şövalye için 1 kaynak kartı çekilir.',
          imageUrl: '/assets/cards/building/metropolis_B_knights.png',
        };
      }
      if (subKind === 'roads') {
        return {
          name: 'Büyükşehir (B) - Yollar',
          category: 'Büyükşehir Kartı',
          cost: '3 Yün + 1 Demir',
          costResources: [
            { resource: 'wool', count: 3 },
            { resource: 'ore', count: 1 },
          ],
          vp: 3,
          effect: 'Hasat fazında +1 kaynak. İnşa edildiğinde sahip olunan her yol için 1 kaynak çekilir.',
          description: 'Açık bir Şehrin üzerine kurulur. Hasat fazında +1 ek kaynak kazandırır. İnşa edildiğinde, o ana kadar inşa edilmiş her yol için 1 kaynak kartı çekilir.',
          imageUrl: '/assets/cards/building/metropolis_B_roads.png',
        };
      }
      if (subKind === 'longest_route') {
        return {
          name: 'Büyükşehir (B) - En Uzun Yol Eşitliği',
          category: 'Büyükşehir Kartı',
          cost: '3 Yün + 1 Demir',
          costResources: [
            { resource: 'wool', count: 3 },
            { resource: 'ore', count: 1 },
          ],
          vp: 3,
          effect: 'Hasat fazında +1 kaynak. En Uzun Yol bonusunda berabere kalındığında kart sizde kalır.',
          description: 'Hasat fazında +1 ek kaynak kazandırır. En Uzun Yol bonusunda berabere kalındığında kart size geçer / sizde kalır.',
          imageUrl: '/assets/cards/building/metropolis_B_longest_route.png',
        };
      }
      if (subKind === 'largest_army') {
        return {
          name: 'Büyükşehir (B) - En Güçlü Ordu Eşitliği',
          category: 'Büyükşehir Kartı',
          cost: '3 Yün + 1 Demir',
          costResources: [
            { resource: 'wool', count: 3 },
            { resource: 'ore', count: 1 },
          ],
          vp: 3,
          effect: 'Hasat fazında +1 kaynak. En Güçlü Ordu bonusunda berabere kalındığında kart sizde kalır.',
          description: 'Hasat fazında +1 ek kaynak kazandırır. En Güçlü Ordu bonusunda berabere kalındığında kart size geçer / sizde kalır.',
          imageUrl: '/assets/cards/building/metropolis_B_largest_army.png',
        };
      }
      return {
        name: 'Büyükşehir (A)',
        category: 'Büyükşehir Kartı',
        cost: '3 Yün + 1 Demir',
        costResources: [
          { resource: 'wool', count: 3 },
          { resource: 'ore', count: 1 },
        ],
        vp: 3,
        effect: 'Sıra sendeyken: +🃏🃏 (Kendi turunda Hasat fazında fazladan +2 ek kaynak).',
        description: 'Açık bir Şehrin üzerine kurulur (net +1 ZP, toplam 3 ZP). Kendi turunda Hasat fazında fazladan +2 ek kaynak kazandırır.',
        imageUrl: '/assets/cards/building/metropolis_A.png',
      };
    }
    case 'robber':
      return {
        name: 'Hırsız (Robber)',
        category: 'Olay Kartı',
        effect: 'Elinde (7 + şövalye) kartından fazla kaynak olan herkes yarısını ıskartaya atar.',
        description: 'Elinde (7 + şövalye) kartından fazla kaynak kartı olan herkes, elindeki kartların yarısını (aşağı yuvarlanır) ıskartaya atar.',
        imageUrl: '/assets/cards/event/event_robber.png',
      };
    case 'solstice':
      return {
        name: 'Yeni Yıl / Gündönümü (Solstice)',
        category: 'Olay Kartı',
        effect: 'Her oyuncu desteden 1 kaynak çeker. Tüm olay kartları karıştırılıp yeni deste yapılır.',
        description: 'Her oyuncu desteden 1 kaynak çeker. Ardından tüm olay kartları karıştırılıp yeni olay destesi yapılır.',
        imageUrl: '/assets/cards/event/event_solstice.png',
      };
    case 'abundance':
      return {
        name: 'Bolluk / Teşvik (Abundance)',
        category: 'Olay Kartı',
        effect: 'Bonus kartı olmayan diğer tüm oyuncular desteden 2 kaynak çeker.',
        description: 'En Uzun Yol veya En Güçlü Ordu bonus kartı olanlar HARİÇ diğer tüm oyuncular desteden 2 kaynak çeker.',
        imageUrl: '/assets/cards/event/event_abundance.png',
      };
    case 'subsidy':
      return {
        name: 'Hasat Kutlaması / Sübvansiyon (Subsidy)',
        category: 'Olay Kartı',
        effect: 'Her açık Köy için desteden 1 kaynak çektirir (Şehre dönüştürülenler sayılmaz).',
        description: 'Her oyuncu, önündeki açık her Köy için desteden 1 kaynak çeker (Şehre dönüştürülmüş köyler sayılmaz).',
        imageUrl: '/assets/cards/event/event_subsidy.png',
      };
    case 'charity':
      return {
        name: 'Sadaka (Charity)',
        category: 'Olay Kartı',
        effect: 'En çok Zafer Puanına sahip oyuncu, daha az puanı olan bir oyuncuya 1 kaynak verir.',
        description: 'En çok Zafer Puanına sahip oyuncu, kendisinden daha az puanı olan bir oyuncuya 1 kaynak verir.',
        imageUrl: '/assets/cards/event/event_charity.png',
      };
    case 'longest_route':
      return {
        name: 'En Uzun Yol (Longest Route)',
        category: 'Bonus Kartı',
        vp: 2,
        effect: '2 Zafer Puanı. 3 yola ilk ulaşan alır; daha fazla yola sahip olan çıkınca el değiştirir.',
        description: '3 yola ilk ulaşan alır; daha fazla yola ulaşan olursa anında ona geçer. 2 Zafer Puanı değerindedir.',
        imageUrl: '/assets/cards/bonus/bonus_longest_route.png',
      };
    case 'largest_army':
      return {
        name: 'En Güçlü Ordu (Largest Army)',
        category: 'Bonus Kartı',
        vp: 2,
        effect: '2 Zafer Puanı. 2 şövalyeye ilk ulaşan alır; daha fazla şövalyeye sahip olan çıkınca el değiştirir.',
        description: '2 şövalyeye ilk ulaşan alır; daha fazla şövalyeye ulaşan olursa anında ona geçer. 2 Zafer Puanı değerindedir.',
        imageUrl: '/assets/cards/bonus/bonus_largest_army.png',
      };
    case 'brick':
      return {
        name: 'Tuğla (Brick)',
        category: 'Kaynak Kartı',
        effect: 'Yol ve Köy inşasında temel inşaat malzemesidir.',
        description: 'Yol ve Köy inşasında kullanılır.',
        imageUrl: '/assets/cards/resource/resource_brick.png',
      };
    case 'wood':
      return {
        name: 'Odun (Wood)',
        category: 'Kaynak Kartı',
        effect: 'Yol ve Köy inşasında temel inşaat malzemesidir.',
        description: 'Yol ve Köy inşasında kullanılır.',
        imageUrl: '/assets/cards/resource/resource_wood.png',
      };
    case 'wool':
      return {
        name: 'Yün (Wool)',
        category: 'Kaynak Kartı',
        effect: 'Köy, Şövalye ve Büyükşehir yapımında gereklidir.',
        description: 'Köy, Şövalye ve Büyükşehir inşasında kullanılır.',
        imageUrl: '/assets/cards/resource/resource_wool.png',
      };
    case 'wheat':
      return {
        name: 'Buğday (Wheat)',
        category: 'Kaynak Kartı',
        effect: 'Köy, Şehir ve Şövalye beslemesinde gereklidir.',
        description: 'Köy, Şehir ve Şövalye inşasında kullanılır.',
        imageUrl: '/assets/cards/resource/resource_wheat.png',
      };
    case 'ore':
      return {
        name: 'Demir (Ore)',
        category: 'Kaynak Kartı',
        effect: 'Şehir, Şövalye ve Büyükşehir inşasında ağır sanayi cevheridir.',
        description: 'Şehir, Şövalye ve Büyükşehir inşasında kullanılır.',
        imageUrl: '/assets/cards/resource/resource_ore.png',
      };
  }
}

export function getCardDetails(
  type: BuildingType | 'metropolis' | EventKind | 'longest_route' | 'largest_army' | Resource,
  subKind?: MetropolisBKind
): CardDetails {
  const details = getRawCardDetails(type, subKind);
  return {
    ...details,
    imageUrl: assetUrl(details.imageUrl),
  };
}

