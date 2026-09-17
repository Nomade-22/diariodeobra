export function resolvePhotoSrc(photoKey:string):string{return /^https?:\/\//i.test(photoKey)?photoKey:`/api/files/${photoKey}`;}
