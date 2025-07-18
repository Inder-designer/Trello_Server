import { PipelineStage } from "mongoose";

interface CarFilterParams {
    brand?: string;
    year?: number;
    seat?: number;
    carType?: string;
    listingType?: string;
    transmission?: string;
    minPrice?: number;
    maxPrice?: number;
}

export const getCarFilterPipeline = (params: CarFilterParams): PipelineStage[] => {
    const {
        brand,
        year,
        seat,
        carType,
        listingType,
        transmission,
        minPrice,
        maxPrice,
    } = params;

    const match: Record<string, any> = { status: "active" };

    if (brand) match.brand = brand;
    if (year) match.year = year;
    if (seat) match.seats = seat;
    if (carType) match.carType = carType;
    if (listingType) match.listingType = listingType;
    if (transmission) match.transmission = transmission;

    if (minPrice !== undefined || maxPrice !== undefined) {
        if (listingType === 'rent') {
            match['rentPrice.price'] = {};
            if (minPrice !== undefined) match['rentPrice.price'].$gte = minPrice;
            if (maxPrice !== undefined) match['rentPrice.price'].$lte = maxPrice;
        } else {
            match.price = {};
            if (minPrice !== undefined) match.price.$gte = minPrice;
            if (maxPrice !== undefined) match.price.$lte = maxPrice;
        }
    }

    const pipeline: PipelineStage[] = [
        { $match: match },
        {
            $facet: {
                cars: [
                    { $sort: { createdAt: -1 } },
                    // pagination stages can go here
                ],
                brands: [
                    { $group: { _id: "$brand", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                ],
                years: [
                    { $group: { _id: "$year", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                    { $sort: { label: -1 } },
                ],
                seats: [
                    { $group: { _id: "$seats", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                    { $sort: { label: 1 } },
                ],
                transmissions: [
                    { $group: { _id: "$transmission", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                ],
                carTypes: [
                    { $group: { _id: "$carType", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                ],
                listingTypes: [
                    { $group: { _id: "$listingType", count: { $sum: 1 } } },
                    { $project: { label: "$_id", count: 1, _id: 0 } },
                ],
                priceRange: [
                    {
                        $group: {
                            _id: null,
                            min: {
                                $min: {
                                    $cond: [
                                        { $eq: ["$listingType", "rent"] },
                                        "$rentPrice.price",
                                        "$price"
                                    ]
                                }
                            },
                            max: {
                                $max: {
                                    $cond: [
                                        { $eq: ["$listingType", "rent"] },
                                        "$rentPrice.price",
                                        "$price"
                                    ]
                                }
                            }
                        }
                    },
                    { $project: { _id: 0, min: 1, max: 1 } },
                ],
            },
        },
    ];

    return pipeline;
};
