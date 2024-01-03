const svg = d3.select('svg');
const width = +svg.attr('width');
const height = +svg.attr('height');

const margin = {top: 80, right: 20, bottom: 20, left: 150};

const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// 地理投影和地圖路徑
const projection = d3.geoRobinson()
        .scale(200)
        .center([30, -30])
        .translate([width/2.2, height/2]);

const path = d3.geoPath().projection(projection);

const color = d3.scaleThreshold()
    .domain([0, 1000, 2500, 5000, 10000, 20000, 50000, 100000])
    .range(d3.schemeBlues[9])
    .unknown("#E6E6E6");

const poly = g.append("g");
const line = g.append("g");

let topologyData;
let economyData;
let internetData;
const idMapping = {};
const data = {};


// 更新地圖數據
const updataData = (topology, economy, year, internet) => {
    const filteredData = economy.filter(d => +d[' Year '] === year);
    filteredData.forEach(d => {
        const alpha3 = idMapping[d[' CountryID '].padStart(3, '0')];
        d.Year = +d[' Year '];
        d.GNI = +d[' Per capita GNI '];
        d.alpha3 = alpha3;
        d.country = d[' Country ']
        data[alpha3] = d.GNI;
    });

    const GNIbyCode = {};
    economy.filter(d => +d[' Year '] >= 1980 && +d[' Year '] <= 2020).forEach(d => {
        const alpha3 = idMapping[d[' CountryID '].padStart(3, '0')];
        d.Year = +d[' Year '];
        d.GNI = +d[' Per capita GNI '];
        d.alpha3 = alpha3;

        if (!GNIbyCode[alpha3]) {
            GNIbyCode[alpha3] = [];
        }
        GNIbyCode[alpha3].push({
            Year: d.Year,
            GNI: +d.GNI
        });
    });

    const mouseover = function(d) {
        d3.selectAll(".countries")
            .transition()
            .duration(100)
            .style("opacity", .3)
        d3.select(this)
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "black")

        // Country Name Label
        d3.select("#country-name")
            .attr('left', '1000px')
            .attr('top', '200px')
            .style("font-size", '16px')
            .text(d.toElement.__data__.properties.gis_name)
            .style("color", "white");
        d3.select("#country-name").classed("hidden", false);
    };
    const mouseleave = function(d) {
        d3.selectAll(".countries")
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "transparent")
        d3.select(this)
            .transition()
            .duration(100)
            .style("opacity", 1)
            .style("stroke", "transparent")
        d3.select("#country-name").classed("hidden", true);
    };

    poly.selectAll("path")
        .data(topojson.feature(topology, topology.objects.world_polygons_simplified).features)
        .join("path")
            .attr("fill", function(d) { 
                return color(d.GNI = data[d.properties.iso3]); })
            .attr("d", path)
            .attr("class", function(d){ return "countries" })
        .on("mouseover", mouseover )
        .on("mouseleave", mouseleave )
        .on("click", function(event, d) {
            // 建議用iso3去找對應的數據
            const countryInternet = internet.filter(item => item['Code'] === d.properties.iso3);
            const countryGNI = GNIbyCode[d.properties.iso3];
            updateGraph(countryInternet, countryGNI)
        });

};

//小圖表
const graphMargin = {top: 55, bottom: 60, left: 60, right: 50, tab: 200},
    graphWidth = width/2,
    graphHeight = height/2;
const innerWidth = graphWidth - graphMargin.left - graphMargin.right - 25,
    innerHeight = graphHeight - graphMargin.top - graphMargin.bottom - 25;
const graphSvg = svg.append('g')
    .attr('class', 'graph')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .style('display', 'none');

const updateGraph = (countryInternet, countryGNI) => {
    graphSvg.selectAll('*').remove();
    
    if (countryInternet.length > 0 && countryGNI.length > 0){
        const internetYears = countryInternet.map(d => String(d.Year));
        const GNIYears = new Set(countryGNI.map(d => String(d.Year)));
        const years = Array.from(new Set([...internetYears, ...GNIYears])).sort();
        console.log(years)
        graphSvg.append("rect")
            .attr("fill", "white")
            .attr("stroke", "#aaa")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", graphWidth)
            .attr("height", graphHeight);

        const charts = graphSvg.append('g')
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr('transform', `translate(${graphMargin.left}, ${graphMargin.top})`);
        
        //X axis
        const x = d3.scaleBand().range([0, innerWidth]).padding(0.5);
        x.domain(years.map(String));
        charts.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        
        //Y axis
        const y = d3.scaleLinear().range([innerHeight, 0]);
        y.domain([0, 100]);

        charts.append('g')
            .call(d3.axisLeft(y))
            .append('text')
            .attr('fill', '#000')
            .attr('x', 40)
            .attr('y', -20)
            .attr('dy', '0.71em')
            .attr('text-anchor', 'end')
            .text('Internet Users(%)');

        const bars = charts.append('g')
            .selectAll('.bar')
            .data(countryInternet)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(String(d.Year)))
            .attr('y', d => y(d['Internet Users(%)']))
            .attr('width', x.bandwidth())
            .attr('height', d => innerHeight - y(d['Internet Users(%)']))
            .attr('fill', 'steelblue');

        const z = d3.scaleLinear().range([innerHeight, 0]);
        z.domain([0, d3.max(countryGNI, d => +d['GNI'])]);
        
        charts.append('g')
            .attr('transform', `translate(${innerWidth}, 0)`)
            .call(d3.axisRight(z))
            .append('text')
            .attr('fill', '#000')
            .attr('x', 10)
            .attr('y', -20)
            .attr('dy', '0.71em')
            .attr('text-anchor', 'end')
            .text('GNI');
        
        const line = d3.line()
            .x(d => x(String(d.Year)) + x.bandwidth() / 2)
            .y(d => z(d['GNI']));

        const lines = charts.append('path')
            .datum(countryGNI)
            .attr('class', 'line')
            .attr('d', line)
            .attr('stroke', 'red')
            .attr('fill', 'none');
    
        // Legend for Internet Users(%)
        charts.append("rect")
            .attr("x", graphMargin.left)
            .attr("y", innerHeight + graphMargin.bottom - 20) // Adjusted y position
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", "steelblue");

        charts.append("text")
            .attr("x", graphMargin.left+20)
            .attr("y", innerHeight + graphMargin.bottom - 10) // Adjusted y position
            .text("Internet Users(%)");

        // Legend for GNI
        charts.append("rect")
            .attr("x", graphMargin.left+graphMargin.tab)
            .attr("y", innerHeight + graphMargin.bottom - 20) // Adjusted y position
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", "red");

        charts.append("text")
            .attr("x", graphMargin.left+20+graphMargin.tab)
            .attr("y", innerHeight + graphMargin.bottom - 10) // Adjusted y position
            .text("GNI");

        graphSvg.style('display', 'block');

        // close barChart
        const closeBotton = graphSvg.append('g')
        .attr('id', 'close-button')
        .attr('transform', `translate(${graphMargin.left + innerWidth + 25}, ${graphMargin.top - 45})`)
        .style('cursor', 'pointer')
        .on('click', function() {
            graphSvg.style("display", "none");
        });

        closeBotton.append('rect')
        .attr('width', 25)
        .attr('height', 25)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', '#635F5D');

        closeBotton.append('text')
        .text('✖')
        .attr('x', 6)
        .attr('y', 18)
        .attr('font-size', '15px')
        .style('fill', 'red');
    }
    else{
        graphSvg.style('display', 'none');
    };
};


//------------------------------//

const dataURL = "Global Economy Indicators.csv"; 
const polygonsURL = "https://raw.githubusercontent.com/GDS-ODSSS/unhcr-dataviz-platform/master/data/geospatial/world_polygons_simplified.json";
const polylinesURL = "https://raw.githubusercontent.com/GDS-ODSSS/unhcr-dataviz-platform/master/data/geospatial/world_lines_simplified.json";
const isoURL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

const data1URL = "Global Internet users.csv";

const promises = [
    d3.json(polygonsURL),
    d3.csv(dataURL),
    d3.csv(isoURL),
    d3.csv(data1URL)
];

// 載入數據並建立country code和alpha3的對應關係
Promise.all(promises).then(ready);
function ready([topology, economy, iso, internet]) {
    const defaultYear = 1980;
    topologyData = topology;
    economyData = economy;
    internetData = internet;
    iso.forEach(entry => {
        idMapping[entry['country-code']] = entry['alpha-3'];
    });
    
    updataData(topologyData,  economyData, defaultYear, internetData);

};

// 繪製地球表面
d3.json(polylinesURL).then(function(topology) {
    line.selectAll("path")
        .data(topojson.feature(topology, topology.objects.world_lines_simplified).features)
        .enter().append("path")
            .attr("d", path)
            .attr("class", function(d){ return d.properties.type })
            .style("fill", "none");
});

// 縮放功能
const zoom = true;
if (zoom) {
    var zoomFunction = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', function(event) {
            poly.selectAll('path')
                .attr('transform', event.transform);
            line.selectAll('path')
                .attr('transform', event.transform);
        });
    g.call(zoomFunction);
}

// 創建圖例
svg.append("g")
    .attr("class", "legendThreshold")
    .attr("transform", "translate(1240, 100)");

const legend = d3.legendColor()
    .labelFormat(d3.format(".0f"))
    .labels(d3.legendHelpers.thresholdLabels)
    .labelOffset(3)
    .shapePadding(0)
    .scale(color);

svg.select(".legendThreshold")
    .call(legend);

// 創建滑動條
var slider = d3.sliderVertical()
    .min(1980)
    .max(2020)
    .step(1)
    .width(100)
    .height(400)
    .tickFormat(d3.format('d'))
    .on('onchange', val => {
        updataData(topologyData, economyData, val, internetData);   
    }); 

g.append('g')
    .attr('id', 'slider')
    .attr('transform', 'translate(-30, 30)')
    .call(slider);

let interval;

// 點擊播放按鈕的事件處理程序
const playButtonCLick = () => {
    if (!interval) {
        interval = setInterval(() => {
            const currentValue = slider.value();
            if (currentValue < 2020) {
                slider.value(currentValue + 1);
            }
            else {
                clearInterval(interval);
                interval = null;
            }
        }, 300);
    }
    else {
        clearInterval(interval);
        interval = null;
    }
}

// 創建播放按鈕
const playButton = svg.append('g')
    .attr('id', 'play-button')
    .attr('transform', `translate(${margin.left - 65}, ${margin.top + 460})`)
    .style('cursor', 'pointer')
    .on('click', playButtonCLick);

playButton.append('rect')
    .attr('width', 75)
    .attr('height', 30)
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('fill', '#4CAF50');

playButton.append('text')
    .text('▶ Play')
    .attr('font-size', '16px')
    .attr('x', 10)
    .attr('y', 20)
    .style('fill', 'white');