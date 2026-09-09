import { Order, OrderItem } from '@prisma/client';
const money = (minor: number) => `${new Intl.NumberFormat('sr-RS').format(BigInt(minor) / 100n)},${String(BigInt(minor) % 100n).padStart(2, '0')} RSD`;
export function orderEmailText(order: Order & { items: OrderItem[] }, club: boolean) {
  return [
    club ? 'НОВА ПОРУЏБИНА' : 'ПОРУЏБИНА ЈЕ УСПЕШНО ПРИМЉЕНА', `Број поруџбине: ${order.orderNumber}`, '',
    ...(club ? ['КУПАЦ', `${order.firstName} ${order.lastName}`, `Телефон: ${order.phone}`, `Имејл: ${order.email}`, `Адреса: ${order.address}`, `Град: ${order.city}`, `Поштански број: ${order.postalCode}`, ''] : ['Хвала вам на поруџбини. Клуб је примио ваше податке и обрадиће поруџбину у најкраћем року.', '']),
    'ПРОИЗВОДИ', ...order.items.map((item) => `${item.productName} — Величина: ${item.size} × ${item.quantity}; цена по комаду: ${money(item.unitPriceMinor)}; након попуста: ${money(item.finalMinor)}`), '',
    'ОБРАЧУН', `Укупно пре попуста: ${money(order.subtotalMinor)}`, `Попуст за сезонску карту (${order.discountPercent}%): ${money(order.discountMinor)}`, `УКУПНО ЗА ПРОИЗВОДЕ: ${money(order.totalMinor)}`, '',
    'Трошак доставе није укључен у приказани износ и обрачунава се накнадно. Достава је доступна само у Србији.',
    'Плаћање поузећем. Плаћање се врши куриру приликом преузимања пошиљке.',
    'Статус при пријему поруџбине: Нова', ...(club && order.note ? ['', 'НАПОМЕНА', order.note] : []),
  ].join('\n');
}
