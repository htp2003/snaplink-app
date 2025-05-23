import { View, Text } from 'react-native'
import React, { useState, useEffect } from 'react'


export interface Location {
    id: string;
    name: string;
    avatar: string;
    images: string[];
    styles: string[];
}

export function useLocations() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Fetch API
        const fetchProfiles = async () => {
            try {
                setLoading(true)
                await new Promise((resolve) => setTimeout(resolve, 500))

                const mockLocations: Location[]= [
                    {
                        id: '1',
                        name: 'Marc Huybrighs',
                        avatar: require('../../assets/slider1.png'),
                        images: [
                            require('../../assets/slider1.png'),
                            require('../../assets/slider2.png'),
                            require('../../assets/slider3.png'),
                            require('../../assets/slider4.png'),
                        ],
                        styles: ['Portrait', 'Landscape']
                    },
                    {
                        id: '2',
                        name: 'David Silva',
                        avatar: require('../../assets/slider2.png'),
                        images: [
                            require('../../assets/slider2.png'),
                            require('../../assets/slider3.png'),
                            require('../../assets/slider4.png'),
                            require('../../assets/slider1.png'),
                        ],
                        styles: ['Street', 'Portrait']
                    },
                    {
                        id: '3',
                        name: 'Anna Lee',
                        avatar: require('../../assets/slider3.png'),
                        images: [
                            require('../../assets/slider3.png'),
                            require('../../assets/slider4.png'),
                            require('../../assets/slider1.png'),
                            require('../../assets/slider2.png'),
                        ],
                        styles: ['Fashion', 'Portrait']
                    }
                ]
                setLocations(mockLocations)
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'))
            } finally {
                setLoading(false)
            }
        }
        fetchProfiles()
    }, [])

    const refresh = async () => {
        try {
            setLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 500));
            const mockLocations: Location[]= [
                {
                    id: '1',
                    name: 'Marc Huybrighs',
                    avatar: require('../../assets/slider1.png'),
                    images: [
                        require('../../assets/slider1.png'),
                        require('../../assets/slider2.png'),
                        require('../../assets/slider3.png'),
                        require('../../assets/slider4.png'),
                    ],
                    styles: ['Portrait', 'Landscape']
                },
                {
                    id: '2',
                    name: 'David Silva',
                    avatar: require('../../assets/slider2.png'),
                    images: [
                        require('../../assets/slider2.png'),
                        require('../../assets/slider3.png'),
                        require('../../assets/slider4.png'),
                        require('../../assets/slider1.png'),
                    ],
                    styles: ['Street', 'Portrait']
                },
                {
                    id: '3',
                    name: 'Anna Lee',
                    avatar: require('../../assets/slider3.png'),
                    images: [
                        require('../../assets/slider3.png'),
                        require('../../assets/slider4.png'),
                        require('../../assets/slider1.png'),
                        require('../../assets/slider2.png'),
                    ],
                    styles: ['Fashion', 'Portrait']
                }
            ]
            setLocations(mockLocations)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'))
        } finally {
            setLoading(false)
        }
    }

    return { locations, loading, error, refresh };
}