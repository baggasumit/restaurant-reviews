const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const webp = require('gulp-webp');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const pump = require('pump');

gulp.task('compress', function(cb) {
  pump([gulp.src('js/*.js'), uglify(), gulp.dest('dist')], cb);
});

gulp.task('compress-css', () => {
  return gulp
    .src('css/*.css')
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(gulp.dest('dist'));
});

gulp.task('compress-js', () => {
  return gulp
    .src('js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('webp', () =>
  gulp
    .src('images/**/*.jpg')
    .pipe(webp())
    .pipe(gulp.dest('images'))
);

gulp.task('default', () => {
  console.log('Hello, Gulp!');
  gulp.watch('sass/**/*.scss', ['styles']);
});

gulp.task('styles', () => {
  gulp
    .src('sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(
      autoprefixer({
        browsers: ['last 2 versions'],
      })
    )
    .pipe(gulp.dest('./css'));
});

gulp.task('watch', () => {
  gulp.watch('sass/**/*.scss', ['styles']);
});
