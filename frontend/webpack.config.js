const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./src/index.js", // Dẫn tới file index.js ta đã tạo
    output: {
        // path: path.join(__dirname, "/build"), // Thư mục chứa file được build ra
        path: path.join(__dirname, '..', "build/public"), // Thư mục chứa file được build ra
        filename: "src/js/[name].js", // Tên file JS và phân tách theo thư mục js/
        publicPath: "/",
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-react',
                        ],
                    },
                },
            },
            {
                test: /\.(css|scss)$/, 
                // Đã thêm postcss-loader vào giữa css-loader và sass-loader
                use: [
                    "style-loader", 
                    "css-loader", 
                    "postcss-loader", 
                    "sass-loader"
                ],
            },
            {
                test: /\.(jpg|jpeg|png|gif|svg|webp)$/i, // Để xử lý hình ảnh
                type: "asset/resource", // Sử dụng webpack 5 asset modules
                generator: {
                    filename: "src/img/[name].[contenthash][ext]", // Lưu ảnh trong thư mục img/
                },
            },
            {
                test: /\.(woff|woff2|ttf|eot|otf)$/i, // Để xử lý font
                type: "asset/resource", // Sử dụng webpack 5 asset modules
                generator: {
                    filename: "src/fonts/[name].[contenthash][ext]", // Lưu font trong thư mục fonts/
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
            filename: "index.html",
            inject: true,
        }),
    ],
    devServer: {
        static: path.resolve(__dirname, "public"), // Thư mục tĩnh
        port: 8080, // Cổng chạy server
        open: true, // Mở trình duyệt khi chạy
        hot: true, // Bật chế độ hot-reload
        historyApiFallback: true, // Điều hướng tất cả các route về index.html
    },
};