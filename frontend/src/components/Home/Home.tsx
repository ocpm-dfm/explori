import React, {useState} from 'react';
import '../../App.css';
import {DirectlyFollowsMultigraph, FilteredDFM} from "../dfm/dfm";
import { ObjectSelection } from "../ObjectSelection/ObjectSelection";
import {ExploriNavbar} from "../ExploriNavbar/ExploriNavbar";

import "./Home.css";

function Home() {
    const [state, setState] = useState({
        threshold: 100
    })

    // const dfm: DirectlyFollowsMultigraph = {
    //     nodes: [
    //         {
    //             label: "First activity",
    //             threshold: 0
    //         },
    //         {
    //             label: "Optional activity, only for obj-t-1",
    //             threshold: 0.5
    //         },
    //         {
    //             label: "Third activity",
    //             threshold: 0
    //         }
    //     ],
    //     subgraphs: {
    //         "obj-t-1": [
    //             {
    //                 source: 0,
    //                 target: 2,
    //                 threshold: 0
    //             },
    //             {
    //                 source: 0,
    //                 target: 1,
    //                 threshold: 0.5,
    //             },
    //             {
    //                 source: 1,
    //                 target: 2,
    //                 threshold: 0.5
    //             }
    //         ],
    //         "obj-t-2": [
    //             {
    //                 source: 0,
    //                 target: 2,
    //                 threshold: 0
    //             }
    //         ]
    //     }
    // };

    const dfm: DirectlyFollowsMultigraph = {
        "nodes": [
            {
                "label": "Create Purchase Order",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        0.795134443021767,
                        414
                    ],
                    [
                        0.8975672215108835,
                        494
                    ],
                    [
                        1.01,
                        574
                    ]
                ]
            },
            {
                "label": "Receive Goods",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        0.6927016645326505,
                        414
                    ],
                    [
                        0.8975672215108835,
                        494
                    ],
                    [
                        1.01,
                        574
                    ]
                ]
            },
            {
                "label": "Issue Goods Receipt",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        0.6927016645326505,
                        414
                    ],
                    [
                        0.8975672215108835,
                        494
                    ],
                    [
                        1.01,
                        574
                    ]
                ]
            },
            {
                "label": "Receive Invoice",
                "threshold": 0.5300896286811779,
                "counts": [
                    [
                        0.5300896286811779,
                        0
                    ],
                    [
                        0.8975672215108835,
                        127
                    ],
                    [
                        1.01,
                        207
                    ]
                ]
            },
            {
                "label": "Clear Invoice",
                "threshold": 0.5300896286811779,
                "counts": [
                    [
                        0.5300896286811779,
                        0
                    ],
                    [
                        0.6927016645326505,
                        127
                    ],
                    [
                        0.8975672215108835,
                        207
                    ],
                    [
                        1.01,
                        287
                    ]
                ]
            },
            {
                "label": "Create Purchase Requisition",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        0.795134443021767,
                        414
                    ],
                    [
                        1.01,
                        494
                    ]
                ]
            },
            {
                "label": "Plan Goods Issue",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        1.01,
                        414
                    ]
                ]
            },
            {
                "label": "Verify Material",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        1.01,
                        414
                    ]
                ]
            },
            {
                "label": "Goods Issue",
                "threshold": 0,
                "counts": [
                    [
                        0,
                        0
                    ],
                    [
                        0.323943661971831,
                        253
                    ],
                    [
                        1.01,
                        414
                    ]
                ]
            }
        ],
        "subgraphs": {
            "PURCHORD": [
                {
                    "source": 0,
                    "target": 1,
                    "threshold": 0.8975672215108835,
                    "counts": [
                        [
                            0.8975672215108835,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                },
                {
                    "source": 1,
                    "target": 2,
                    "threshold": 0.8975672215108835,
                    "counts": [
                        [
                            0.8975672215108835,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                },
                {
                    "source": 2,
                    "target": 3,
                    "threshold": 0.8975672215108835,
                    "counts": [
                        [
                            0.8975672215108835,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                },
                {
                    "source": 3,
                    "target": 4,
                    "threshold": 0.8975672215108835,
                    "counts": [
                        [
                            0.8975672215108835,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                }
            ],
            "PURCHREQ": [
                {
                    "source": 5,
                    "target": 0,
                    "threshold": 0.795134443021767,
                    "counts": [
                        [
                            0.795134443021767,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                }
            ],
            "GDSRCPT": [
                {
                    "source": 1,
                    "target": 2,
                    "threshold": 0.6927016645326505,
                    "counts": [
                        [
                            0.6927016645326505,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                },
                {
                    "source": 2,
                    "target": 4,
                    "threshold": 0.6927016645326505,
                    "counts": [
                        [
                            0.6927016645326505,
                            0
                        ],
                        [
                            1.01,
                            80
                        ]
                    ]
                }
            ],
            "INVOICE": [
                {
                    "source": 3,
                    "target": 4,
                    "threshold": 0.5300896286811779,
                    "counts": [
                        [
                            0.5300896286811779,
                            0
                        ],
                        [
                            1.01,
                            127
                        ]
                    ]
                }
            ],
            "MATERIAL": [
                {
                    "source": 2,
                    "target": 6,
                    "threshold": 0.323943661971831,
                    "counts": [
                        [
                            0.323943661971831,
                            0
                        ],
                        [
                            1.01,
                            161
                        ]
                    ]
                },
                {
                    "source": 6,
                    "target": 7,
                    "threshold": 0.323943661971831,
                    "counts": [
                        [
                            0.323943661971831,
                            0
                        ],
                        [
                            1.01,
                            161
                        ]
                    ]
                },
                {
                    "source": 7,
                    "target": 8,
                    "threshold": 0.323943661971831,
                    "counts": [
                        [
                            0.323943661971831,
                            0
                        ],
                        [
                            1.01,
                            161
                        ]
                    ]
                },
                {
                    "source": 2,
                    "target": 7,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            1.01,
                            253
                        ]
                    ]
                },
                {
                    "source": 7,
                    "target": 6,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            1.01,
                            253
                        ]
                    ]
                },
                {
                    "source": 6,
                    "target": 8,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            1.01,
                            253
                        ]
                    ]
                },
                {
                    "source": 5,
                    "target": 0,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            0.323943661971831,
                            253
                        ],
                        [
                            1.01,
                            414
                        ]
                    ]
                },
                {
                    "source": 0,
                    "target": 1,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            0.323943661971831,
                            253
                        ],
                        [
                            1.01,
                            414
                        ]
                    ]
                },
                {
                    "source": 1,
                    "target": 2,
                    "threshold": 0,
                    "counts": [
                        [
                            0,
                            0
                        ],
                        [
                            0.323943661971831,
                            253
                        ],
                        [
                            1.01,
                            414
                        ]
                    ]
                }
            ]
        }
    };

    const objectSelection = <ObjectSelection />

    return (
        <React.Fragment>
            <div className="Home">
                <ExploriNavbar lowerRowSlot={objectSelection} />
                <FilteredDFM dfm={dfm} threshold={state.threshold / 100} />
                <div className="Home-DetailSlider">
                    <div className="Home-DetailSlider-Label">
                        Less detail
                    </div>
                    <input type="range" min="0" max="100"
                        className="Home-DetailSlider-Slider"
                        value={state.threshold} onInput={(e) => {
                        setState((old) => {
                            return Object.assign({}, old, {threshold: (e.target as HTMLInputElement).value})
                        })
                    }}/>
                    <div className="Home-DetailSlider-Label">
                        More detail
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default Home;
