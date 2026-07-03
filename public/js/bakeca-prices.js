(() => {
    const products = {
        toplist1: {
            label: "Top List1",
            timeSlots: [
                "09:00-12:00",
                "12:00-14:00",
                "14:00-16:00",
                "16:00-18:00",
                "18:00-21:00",
                "21:00-00:00",
                "00:00-09:00"
            ],
            durations: {
                1: { credits: 7, price: 7 },
                3: { credits: 14, price: 14 },
                7: { credits: 24, price: 24 },
                14: { credits: 42, price: 42 },
                28: { credits: 78, price: 78 }
            }
        },
        toplist3: {
            label: "Top List3",
            timeSlots: [
                "09:00-18:00",
                "10:00-16:00",
                "14:00-20:00",
                "18:00-23:00",
                "23:00-09:00"
            ],
            durations: {
                1: { credits: 18, price: 18 },
                3: { credits: 33, price: 33 },
                7: { credits: 62, price: 62 },
                14: { credits: 111, price: 111 },
                28: { credits: 197, price: 197 }
            }
        }
    };

    const durationLabel = (days) => {
        const labels = {
            1: "1 giorno",
            3: "3 giorni",
            7: "1 settimana",
            14: "2 settimane",
            28: "4 settimane"
        };
        return labels[Number(days)] || `${days} giorni`;
    };

    const getSettings = (product, days) => {
        return products[product]?.durations?.[Number(days)] || null;
    };

    window.BakecaPriceCatalog = {
        durationLabel,
        getSettings,
        products
    };
})();
