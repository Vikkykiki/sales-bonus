/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { discount, sale_price, quantity } = purchase;
    const discountRate = discount / 100;
    const fullPrice = sale_price * quantity;
    return fullPrice * (1 - discountRate);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 15;        // 15%
    else if (index === 1 || index === 2) return 10; // 10%
    else if (index === total - 1) return 0; // 0%
    else return 5; // 5%
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.purchase_records) || !Array.isArray(data.sellers) || !Array.isArray(data.products)) {
        throw new Error("Invalid data format: missing required arrays");
    }

    if (data.purchase_records.length === 0 || data.sellers.length === 0 || data.products.length === 0) {
        throw new Error("One or more data arrays are empty");
    }

    // @TODO: Проверка наличия опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error("Options must include calculateRevenue and calculateBonus functions");
    }

    const { calculateRevenue, calculateBonus } = options;

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = {};
    const sellersIndex = {};

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    data.sellers.forEach(seller => {
        sellersIndex[seller.id] = seller;
        sellerStats[seller.id] = {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {} // { sku: количество }
        };
    });

    const productsIndex = {};
    data.products.forEach(product => {
        productsIndex[product.sku] = product;
    });

    // @TODO: Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const sellerId = record.seller_id;
        const stats = sellerStats[sellerId];
        if (!stats) return;

        record.items.forEach(item => {
            const revenue = calculateRevenue(item, productsIndex[item.sku]);
            stats.revenue += revenue;

            const product = productsIndex[item.sku];
            const cost = product ? product.cost || 0 : 0;
            const costTotal = cost * item.quantity;
            stats.profit += revenue - costTotal;

            stats.sales_count += item.quantity;

            if (!stats.products_sold[item.sku]) {
                stats.products_sold[item.sku] = 0;
            }
            stats.products_sold[item.sku] += item.quantity;
        });
    });

    // Преобразуем в массив и сортируем по прибыли
    const sellersArray = Object.values(sellerStats);
    sellersArray.sort((a, b) => b.profit - a.profit);

    const totalSellers = sellersArray.length;

    // Формируем итоговый отчёт
    return sellersArray.map((seller, index) => {
        // Получаем топ-10 товаров по количеству
        const topProductEntries = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Рассчитываем бонус как сумму (не процент!)
        const bonusPercent = calculateBonus(index, totalSellers, seller);
        const bonusAmount = seller.profit * (bonusPercent / 100);

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: Number(seller.revenue.toFixed(2)),
            profit: Number(seller.profit.toFixed(2)),
            sales_count: seller.sales_count,
            top_products: topProductEntries,
            bonus: Number(bonusAmount.toFixed(2))
        };
    });
}
