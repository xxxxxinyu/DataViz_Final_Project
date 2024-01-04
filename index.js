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

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("opacity", 0)
  .style("font-weight", "bold");

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
        .on("mousemove", function(event, d) {
            const countryName = d.properties.gis_name;
            if (countryName !== undefined) {
                tooltip.html(`&nbsp;${countryName}&nbsp;`)
                    .style("left", function() {
                        return (event.pageX + 10) + "px";
                    })
                    .style("top", (event.pageY - 20) + "px")
                    .style("background-color", "#1A1F23")
                    .style("color", "#EBEAE5")
                    .style("border-radius", "5px");
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
            }
        })
        .on("mouseout", () => {
            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
        })
        .on("click", function(event, d) {
            // 建議用iso3去找對應的數據
            const countryName = d.properties.gis_name;
            const countryInternet = internet.filter(item => item['Code'] === d.properties.iso3);
            const countryGNI = GNIbyCode[d.properties.iso3];
            updateGraph(countryName, countryInternet, countryGNI, event.pageX, event.pageY-margin.top-margin.bottom)
        });

};

//小圖表
const graphMargin = {top: 70, bottom: 50, left: 60, right: 50, tab: 200},
    graphWidth = width/2,
    graphHeight = height/2;
const innerWidth = graphWidth - graphMargin.left - graphMargin.right - 25,
    innerHeight = graphHeight - graphMargin.top - graphMargin.bottom - 25;
const graphSvg = svg.append('g')
    .attr('class', 'graph')
    .style('display', 'none');

const updateGraph = (countryName, countryInternet, countryGNI, locationX, locationY) => {
    graphSvg.selectAll('*').remove();
    console.log(locationX, locationY)
    if (countryInternet.length > 0 && countryGNI.length > 0){
        
        const internetYears = countryInternet.map(d => String(d.Year));
        const GNIYears = new Set(countryGNI.map(d => String(d.Year)));
        const years = Array.from(new Set([...internetYears, ...GNIYears])).sort();
   
        //Box location
        if (locationX+graphWidth > width-margin.left-margin.right)
            if (locationX-graphWidth < margin.left)
                locationX = margin.left;
            else
                locationX = locationX-graphWidth;
            
        if (locationY+graphHeight > height-margin.top-margin.bottom)
            if (locationY-graphHeight < margin.top)
                locationY = margin.top;
            else 
                locationY = locationY-graphHeight;
        
        graphSvg.transition()
            .duration(0) // Set the duration of the transition in milliseconds
            .attr('transform', `translate(${locationX}, ${locationY})`);

        graphSvg.append("rect")
            .attr("fill", "#F3F3F3")
            .attr("stroke", "#aaa")
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", graphWidth)
            .attr("height", graphHeight)
            .style("filter", "url(#drop-shadow)");
        
        //Add shadow for box
        graphSvg.append("defs")
            .append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "150%") 
            .attr("width", "150%")
            .attr("x", "-15%")
            .attr("y", "-15%")
            .append("feDropShadow")
            .attr("dx", 0)
            .attr("dy", 0)
            .attr("stdDeviation", 10) 
            .attr("flood-color", "#555"); 

        //Label
        const graphLabel = graphSvg.append('g')
            .attr('class', 'graph-label')
            .attr('transform', `translate(${graphWidth / 2}, 30)`);
        graphLabel.append('text')
            .attr('text-anchor', 'middle')
            .text(countryName)
            .style('font-size', '18px')
            .style('font-weight', 'bold');

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
            .attr('fill', '#FF997C');

        const z = d3.scaleLinear().range([innerHeight, 0]);
        z.domain([0, d3.max(countryGNI, d => +d['GNI'])]);
        
        charts.append('g')
            .attr('transform', `translate(${innerWidth}, 0)`)
            .call(d3.axisRight(z))
            .append('text')
            .attr('fill', '#000')
            .attr('x', 35)
            .attr('y', -20)
            .attr('dy', '0.71em')
            .attr('text-anchor', 'end')
            .text('Per capita GNI');
        
        const line = d3.line()
            .x(d => x(String(d.Year)) + x.bandwidth() / 2)
            .y(d => z(d['GNI']));

        const lines = charts.append('path')
            .datum(countryGNI)
            .attr('class', 'line')
            .attr('d', line)
            .attr('stroke', '#964F4C')
            .attr('fill', 'none');
    
        //Legends
        const legendData = ["Internet Users(%)", "Per capita GNI"];
        const legendColors = ['#FF997C', '#964F4C'];

        const legend = graphSvg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${graphWidth/4}, ${graphHeight - graphMargin.bottom+15})`);

        const legendItems = legend.selectAll('.legend-item')
            .data(legendData)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * graphMargin.tab}, 0)`);

        legendItems.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', (d, i) => legendColors[i]);

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(d => d)
            .style('font-size', '12px');

        graphSvg.style('display', 'block');

        // close barChart
        const closeBotton = graphSvg.append('g')
        .attr('id', 'close-button')
        .attr('transform', `translate(${graphMargin.left + innerWidth+35}, ${graphMargin.top - 60})`)
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