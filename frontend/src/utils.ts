const preselectedColors = [
    '#E53935',
    '#1E88E5',
    '#7CB342',
    '#FF9800',
    '#5E35B1',
    '#FDD835',
    '#00897B',
    '#D81B60',
    '#795548'
]

function generateColors(numColors: number, colorIndex: number) {
    let h = colorIndex / numColors;
    let i = ~~(h * 6);
    let f = h * 6 - i;
    let q = 1 - f;

    let r, g, b;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
        default: r = 0; g = 0; b = 0; break; // to make typescript happy and avoid r,g,b "possibly" being undefined
    }

    return "#" + ("00" + (~~(r * 255)).toString(16)).slice(-2) + ("00" + (~~(g * 255)).toString(16)).slice(-2) + ("00" + (~~(b * 255)).toString(16)).slice(-2);
}

// Either choose from preselected set of colors or generate an arbitrary amount of colors if not enough were preselected.
// Note that we cannot mix these two approaches and give back preselected colors until we don't have enough and then use
// the color generation as we currently can't make sure we don't generate a color that's identical (or too close) to a
// preselected (and already returned and therefore used) color.
export function getObjectTypeColor(numberOfColorsNeeded: number, indexOfCurrentColor: number) {
    console.assert(indexOfCurrentColor >= 0 && indexOfCurrentColor < numberOfColorsNeeded);

    if(numberOfColorsNeeded <= preselectedColors.length) {
        return preselectedColors[indexOfCurrentColor];
    } else {
        return generateColors(numberOfColorsNeeded, indexOfCurrentColor);
    }
}

export function secondsToHumanReadableFormat(seconds: number, accuracy: number = -1): string {
    function handleTimestep(remainingTime: number, factor: number, unit: string, parts: string[]): [number, string[]] {
        const count = Math.floor(remainingTime / factor)
        if (parts.length > 0 || count > 0)
            parts = parts.concat([`${count}${unit}`])
        return [remainingTime - count * factor, parts]
    }

    let parts: string[] = [];
    let remaining = seconds;
    [remaining, parts] = handleTimestep(remaining, 24 * 60 * 60, "d", parts);
    [remaining, parts] = handleTimestep(remaining, 60 * 60, "h", parts);
    [remaining, parts] = handleTimestep(remaining, 60, "m", parts);
    parts.push(`${Math.round(remaining)}s`);

    if (accuracy > 0 && accuracy < parts.length)
        parts = parts.slice(0, accuracy);

    return parts.reduce((a, b) => a + " " + b);
}